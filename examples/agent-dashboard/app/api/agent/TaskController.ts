/**
 * TaskController manages a single task execution with the real SDK.
 * This runs on the server and uses the real Claude Agent SDK.
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import { nanoid } from "nanoid";
import type { SDKEvent, CreateTaskOptions } from "@assistant-ui/react-agent";
import { logger } from "./logger";

export class TaskController {
  private static readonly EVENT_HISTORY_LIMIT = 2000;
  private taskId: string;
  private options: CreateTaskOptions;
  private eventHistory: Array<{ id: number; event: SDKEvent }> = [];
  private nextEventId = 1;
  private pendingApprovals: Map<
    string,
    { resolve: (decision: "allow" | "deny") => void }
  > = new Map();
  private pendingMessages: string[] = [];
  private messageListeners: Set<() => void> = new Set();
  private isRunning = false;
  private isCancelled = false;
  private eventListeners: Set<() => void> = new Set();
  private abortController: AbortController | null = null;
  private currentCost = 0;
  private toolUseToAgent: Map<string, string> = new Map();
  private mainAgentId = "";
  private processedMessageIds = new Set<string>();
  private lastTurnAssistantParts: string[] = [];

  constructor(taskId: string, options: CreateTaskOptions) {
    this.taskId = taskId;
    this.options = options;
  }

  start(): void {
    this.isRunning = true;
    this.abortController = new AbortController();
    logger.info("controller", "Task controller started", {
      taskId: this.taskId,
    });
    this.runTask();
  }

  cancel(): void {
    this.isCancelled = true;
    this.isRunning = false;
    this.abortController?.abort();

    // Reject all pending approval promises to prevent memory leaks
    for (const [, pending] of this.pendingApprovals) {
      pending.resolve("deny");
    }
    this.pendingApprovals.clear();

    logger.info("controller", "Task cancelled", { taskId: this.taskId });
    this.pushEvent({
      type: "task_failed",
      taskId: this.taskId,
      data: { reason: "cancelled" },
      timestamp: new Date(),
    });
  }

  resolveApproval(approvalId: string, decision: "allow" | "deny"): void {
    logger.info("approval", "Resolving approval", {
      taskId: this.taskId,
      approvalId,
      decision,
    });
    const pending = this.pendingApprovals.get(approvalId);
    if (pending) {
      pending.resolve(decision);
      this.pendingApprovals.delete(approvalId);
    } else {
      logger.warn("approval", "Pending approval not found", { approvalId });
    }
  }

  sendUserMessage(message: string): void {
    logger.info("message", "User message queued", {
      taskId: this.taskId,
      messageLength: message.length,
    });

    // Emit a user_message event for UI display (using message type with special marker)
    this.pushEvent({
      type: "message",
      taskId: this.taskId,
      agentId: this.mainAgentId,
      data: { text: message, isUserMessage: true },
      timestamp: new Date(),
    });

    // Queue the message for the agent
    this.pendingMessages.push(message);
    this.messageListeners.forEach((listener) => listener());
  }

  private waitForUserMessage(): Promise<string> {
    return new Promise((resolve) => {
      if (this.pendingMessages.length > 0) {
        resolve(this.pendingMessages.shift()!);
        return;
      }
      const listener = () => {
        if (this.pendingMessages.length > 0) {
          this.messageListeners.delete(listener);
          resolve(this.pendingMessages.shift()!);
        }
      };
      this.messageListeners.add(listener);
    });
  }

  async *events(
    afterEventId: number = 0,
  ): AsyncGenerator<{ id: number; event: SDKEvent }> {
    let cursor = this.findNextEventIndex(afterEventId);

    while (this.isRunning || cursor < this.eventHistory.length) {
      if (cursor < this.eventHistory.length) {
        const entry = this.eventHistory[cursor];
        cursor++;
        yield entry;
      } else {
        await this.waitForEvent();
      }
    }
  }

  private waitForEvent(): Promise<void> {
    return new Promise((resolve) => {
      const listener = () => {
        this.eventListeners.delete(listener);
        resolve();
      };
      this.eventListeners.add(listener);

      // Timeout to prevent infinite wait
      setTimeout(listener, 100);
    });
  }

  private pushEvent(event: SDKEvent): void {
    this.eventHistory.push({
      id: this.nextEventId++,
      event,
    });

    if (this.eventHistory.length > TaskController.EVENT_HISTORY_LIMIT) {
      this.eventHistory.shift();
    }

    this.eventListeners.forEach((listener) => listener());
  }

  private findNextEventIndex(afterEventId: number): number {
    if (afterEventId <= 0) return 0;
    const nextIndex = this.eventHistory.findIndex(
      (entry) => entry.id > afterEventId,
    );
    return nextIndex === -1 ? this.eventHistory.length : nextIndex;
  }

  private async runTask(): Promise<void> {
    const agentId = `agent_${nanoid()}`;
    this.mainAgentId = agentId;

    // Track conversation history for multi-turn
    const conversationHistory: Array<{
      role: "user" | "assistant";
      content: string;
    }> = [];
    let currentPrompt = this.options.prompt;

    try {
      logger.info("run", "Task execution started", {
        taskId: this.taskId,
        agentId,
      });

      this.pushEvent({
        type: "task_started",
        taskId: this.taskId,
        data: { prompt: this.options.prompt },
        timestamp: new Date(),
      });

      this.pushEvent({
        type: "agent_spawned",
        taskId: this.taskId,
        agentId,
        data: { name: "Claude", parentAgentId: null },
        timestamp: new Date(),
      });

      // Conversational loop - keeps running until cancelled
      while (!this.isCancelled) {
        // Reset assistant response buffer for this turn
        this.lastTurnAssistantParts = [];
        // Build the full prompt with conversation history
        let fullPrompt = currentPrompt;
        if (conversationHistory.length > 0) {
          const historyText = conversationHistory
            .map(
              (m) =>
                `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`,
            )
            .join("\n\n");
          fullPrompt = `Previous conversation:\n${historyText}\n\nUser: ${currentPrompt}`;
        }

        // Run the real SDK query
        logger.debug("run", "Starting SDK query", {
          taskId: this.taskId,
          prompt: fullPrompt.slice(0, 100),
        });

        const defaultApprovalTools = ["Bash", "Write", "Edit"];
        const requiresApproval = this.options.requiresApproval
          ? (toolName: string, input: unknown) =>
              this.options.requiresApproval!(toolName, input)
          : (toolName: string) => defaultApprovalTools.includes(toolName);

        try {
          for await (const message of query({
            prompt: fullPrompt,
            options: {
              model: "sonnet",
              permissionMode: "dontAsk", // Don't use built-in prompts; route through our hook
              // 'tools' specifies available tools
              tools: this.options.allowedTools || [
                "Read",
                "Write",
                "Edit",
                "Bash",
                "Glob",
                "Grep",
                "Task",
                "WebSearch",
              ],
              maxTurns: this.options.maxTurns || 250,
              // Use PreToolUse hook to intercept ALL tool calls (including built-in tools like Bash)
              hooks: {
                PreToolUse: [
                  {
                    // Match all tools
                    hooks: [
                      async (input, toolUseID) => {
                        const hookInput = input as {
                          tool_name: string;
                          tool_input: unknown;
                          tool_use_id: string;
                        };
                        const toolName = hookInput.tool_name;
                        const toolInput = hookInput.tool_input as Record<
                          string,
                          unknown
                        >;

                        logger.info("hook", "PreToolUse hook called", {
                          toolName,
                          taskId: this.taskId,
                          toolUseID,
                        });

                        // Auto-approve safe tools
                        if (!requiresApproval(toolName, toolInput)) {
                          logger.info("hook", "Auto-approving safe tool", {
                            toolName,
                          });
                          return {
                            continue: true,
                            hookSpecificOutput: {
                              hookEventName: "PreToolUse" as const,
                              permissionDecision: "allow" as const,
                            },
                          };
                        }

                        logger.info(
                          "hook",
                          "Requiring approval for dangerous tool",
                          { toolName },
                        );
                        const approvalId = `approval_${nanoid()}`;
                        const toolCallId =
                          hookInput.tool_use_id || `tool_${nanoid()}`;

                        logger.debug("hook", "Tool use requested", {
                          taskId: this.taskId,
                          agentId,
                          toolName,
                          approvalId,
                        });

                        this.pushEvent({
                          type: "tool_use_requested",
                          taskId: this.taskId,
                          agentId,
                          data: {
                            approvalId,
                            toolCallId,
                            toolName,
                            toolInput,
                            reason: `Agent wants to use ${toolName}`,
                          },
                          timestamp: new Date(),
                        });

                        const decision =
                          await this.waitForApprovalDecision(approvalId);

                        if (decision === "deny") {
                          logger.warn("hook", "Tool use denied", {
                            taskId: this.taskId,
                            agentId,
                            toolName,
                            approvalId,
                          });
                          this.pushEvent({
                            type: "tool_use_denied",
                            taskId: this.taskId,
                            agentId,
                            data: { approvalId, toolCallId },
                            timestamp: new Date(),
                          });
                          return {
                            continue: false,
                            hookSpecificOutput: {
                              hookEventName: "PreToolUse" as const,
                              permissionDecision: "deny" as const,
                              permissionDecisionReason:
                                "User denied this tool execution",
                            },
                          };
                        }

                        logger.info("hook", "Tool use approved", {
                          taskId: this.taskId,
                          agentId,
                          toolName,
                          approvalId,
                        });
                        this.pushEvent({
                          type: "tool_use_approved",
                          taskId: this.taskId,
                          agentId,
                          data: { approvalId, toolCallId },
                          timestamp: new Date(),
                        });

                        return {
                          continue: true,
                          hookSpecificOutput: {
                            hookEventName: "PreToolUse" as const,
                            permissionDecision: "allow" as const,
                          },
                        };
                      },
                    ],
                  },
                ],
              },
            },
          })) {
            if (this.isCancelled) break;

            // Convert SDK messages to our event format
            this.processSDKMessage(message, agentId);
          }
        } catch (queryError) {
          logger.error("run", "SDK query error", {
            taskId: this.taskId,
            error:
              queryError instanceof Error
                ? queryError.message
                : "Unknown error",
            stack: queryError instanceof Error ? queryError.stack : undefined,
          });
          this.pushEvent({
            type: "message",
            taskId: this.taskId,
            agentId,
            data: {
              text: `API Error: ${queryError instanceof Error ? queryError.message : "Unknown error"}`,
            },
            timestamp: new Date(),
          });
          // Continue to next iteration or break
          break;
        }

        if (this.isCancelled) break;

        // Store both sides of the conversation in history.
        // Note: lastTurnAssistantParts includes text, tool calls (see line ~568),
        // and tool results (see line ~725) — not just text responses.
        conversationHistory.push({ role: "user", content: currentPrompt });

        if (this.lastTurnAssistantParts.length > 0) {
          conversationHistory.push({
            role: "assistant",
            content: this.lastTurnAssistantParts.join("\n"),
          });
        }

        logger.info("run", "Query turn completed, waiting for user message", {
          taskId: this.taskId,
          agentId,
        });

        // Emit a waiting state (using message type with special marker)
        this.pushEvent({
          type: "message",
          taskId: this.taskId,
          agentId,
          data: {
            text: "Waiting for your response...",
            isWaitingForInput: true,
          },
          timestamp: new Date(),
        });

        // Wait for user message with a 5-minute timeout
        const userMessagePromise = this.waitForUserMessage();
        const timeoutPromise = new Promise<null>((resolve) =>
          setTimeout(() => resolve(null), 5 * 60 * 1000),
        );

        const userMessage = await Promise.race([
          userMessagePromise,
          timeoutPromise,
        ]);

        if (!userMessage || this.isCancelled) {
          // Timeout or cancelled - complete the task
          break;
        }

        // Continue the conversation
        currentPrompt = userMessage;
        logger.info("run", "Continuing conversation with user message", {
          taskId: this.taskId,
          messageLength: userMessage.length,
        });
      }

      if (!this.isCancelled) {
        logger.info("run", "Task completed successfully", {
          taskId: this.taskId,
          agentId,
          cost: this.currentCost,
        });

        this.pushEvent({
          type: "agent_completed",
          taskId: this.taskId,
          agentId,
          data: { finalCost: this.currentCost },
          timestamp: new Date(),
        });

        this.pushEvent({
          type: "task_completed",
          taskId: this.taskId,
          data: { totalCost: this.currentCost },
          timestamp: new Date(),
        });
      }
    } catch (error) {
      logger.error("run", "Task execution failed", {
        taskId: this.taskId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      this.pushEvent({
        type: "task_failed",
        taskId: this.taskId,
        data: {
          reason: error instanceof Error ? error.message : "Unknown error",
        },
        timestamp: new Date(),
      });
    } finally {
      this.isRunning = false;
      this.eventListeners.forEach((listener) => listener());
    }
  }

  private processSDKMessage(message: any, _defaultAgentId: string): void {
    // Determine which agent this message belongs to based on parent_tool_use_id
    const parentToolUseId = message.parent_tool_use_id;
    const agentId = parentToolUseId
      ? this.toolUseToAgent.get(parentToolUseId) || this.mainAgentId
      : this.mainAgentId;

    switch (message.type) {
      case "system":
        if (message.subtype === "init") {
          logger.debug("sdk", "System initialized", {
            taskId: this.taskId,
            sessionId: message.session_id,
            toolsCount: message.tools?.length,
          });
          this.pushEvent({
            type: "system_init",
            taskId: this.taskId,
            data: {
              sessionId: message.session_id,
              tools: message.tools,
            },
            timestamp: new Date(),
          });
        } else if (message.subtype === "task_notification") {
          const subAgentId = message.task_id || agentId;
          logger.info("sdk", "Task notification", {
            taskId: this.taskId,
            subAgentId,
            status: message.status,
          });
          this.pushEvent({
            type: "agent_completed",
            taskId: this.taskId,
            agentId: subAgentId,
            data: {
              status: message.status,
              summary: message.summary,
            },
            timestamp: new Date(),
          });
        }
        break;

      case "assistant":
        // Track cost from usage data (dedupe by message id)
        if (
          message.usage &&
          message.id &&
          !this.processedMessageIds.has(message.id)
        ) {
          this.processedMessageIds.add(message.id);
          if (message.usage.total_cost_usd !== undefined) {
            const cost = message.usage.total_cost_usd;

            if (agentId === this.mainAgentId) {
              this.currentCost = cost;
            }

            logger.debug("cost", "Cost from assistant message", {
              taskId: this.taskId,
              agentId,
              cost,
            });

            this.pushEvent({
              type: "cost_update",
              taskId: this.taskId,
              agentId,
              data: { cost, totalCost: cost },
              timestamp: new Date(),
            });
          }
        }

        // Process assistant message content
        for (const block of message.message?.content || []) {
          if ("text" in block) {
            logger.debug("sdk", "Assistant message", {
              taskId: this.taskId,
              textLength: block.text.length,
            });
            // Track assistant text for conversation history
            if (agentId === this.mainAgentId) {
              this.lastTurnAssistantParts.push(block.text);
            }
            this.pushEvent({
              type: "message",
              taskId: this.taskId,
              agentId,
              data: { text: block.text },
              timestamp: new Date(),
            });
          } else if ("name" in block) {
            // Track tool calls for conversation history
            if (agentId === this.mainAgentId) {
              const inputStr = JSON.stringify(block.input);
              const truncatedInput =
                inputStr.length > 200
                  ? `${inputStr.slice(0, 200)}...`
                  : inputStr;
              this.lastTurnAssistantParts.push(
                `[Used tool ${block.name}: ${truncatedInput}]`,
              );
            }
            logger.info("tool", "Tool executed", {
              taskId: this.taskId,
              agentId,
              toolName: block.name,
            });
            this.pushEvent({
              type: "tool_use",
              taskId: this.taskId,
              agentId,
              data: {
                toolCallId: block.id,
                toolName: block.name,
                toolInput: block.input,
              },
              timestamp: new Date(),
            });

            // Handle Task tool - spawns a child agent
            if (block.name === "Task") {
              const childAgentId = `agent_${nanoid()}`;
              const input = block.input as {
                description?: string;
                prompt?: string;
              };
              // Map this tool_use_id to the child agent so we can route sub-agent messages
              this.toolUseToAgent.set(block.id, childAgentId);
              logger.info("sdk", "Spawning child agent for Task tool", {
                taskId: this.taskId,
                parentAgentId: agentId,
                childAgentId,
                description: input.description,
              });
              this.pushEvent({
                type: "agent_spawned",
                taskId: this.taskId,
                agentId: childAgentId,
                data: {
                  name: input.description || "Subagent",
                  parentAgentId: agentId,
                },
                timestamp: new Date(),
              });
            }
          }
        }
        break;

      case "stream_event":
        // Real-time streaming events from sub-agents
        if (message.event?.type === "content_block_start") {
          const contentBlock = message.event.content_block;
          if (contentBlock?.type === "tool_use") {
            logger.debug("sdk", "Stream tool use start", {
              taskId: this.taskId,
              agentId,
              toolName: contentBlock.name,
            });
            this.pushEvent({
              type: "tool_use",
              taskId: this.taskId,
              agentId,
              data: {
                toolCallId: contentBlock.id,
                toolName: contentBlock.name,
                toolInput: contentBlock.input,
              },
              timestamp: new Date(),
            });

            if (contentBlock.name === "Task") {
              const childAgentId = `agent_${nanoid()}`;
              const input = contentBlock.input as {
                description?: string;
                prompt?: string;
              };

              this.toolUseToAgent.set(contentBlock.id, childAgentId);
              logger.info("sdk", "Spawning child agent from stream event", {
                taskId: this.taskId,
                parentAgentId: agentId,
                childAgentId,
              });
              this.pushEvent({
                type: "agent_spawned",
                taskId: this.taskId,
                agentId: childAgentId,
                data: {
                  name: input.description || "Subagent",
                  parentAgentId: agentId,
                },
                timestamp: new Date(),
              });
            }
          }
        } else if (message.event?.type === "content_block_delta") {
          const delta = message.event.delta;
          if (delta?.type === "text_delta" && delta.text) {
            this.pushEvent({
              type: "message_delta",
              taskId: this.taskId,
              agentId,
              data: { text: delta.text },
              timestamp: new Date(),
            });
          }
        }
        break;

      case "tool_progress":
        // Progress updates for long-running tools
        logger.debug("tool", "Tool progress", {
          taskId: this.taskId,
          agentId,
          toolName: message.tool_name,
          elapsed: message.elapsed_time_seconds,
        });
        this.pushEvent({
          type: "tool_progress",
          taskId: this.taskId,
          agentId,
          data: {
            toolUseId: message.tool_use_id,
            toolName: message.tool_name,
            elapsedSeconds: message.elapsed_time_seconds,
          },
          timestamp: new Date(),
        });
        break;

      case "user":
        // Process tool results from user messages
        for (const block of message.message?.content || []) {
          if ("tool_use_id" in block) {
            const childAgentId = this.toolUseToAgent.get(block.tool_use_id);

            logger.debug("tool", "Tool result received", {
              taskId: this.taskId,
              agentId,
              toolUseId: block.tool_use_id,
              isError: block.is_error,
              hasChildAgent: !!childAgentId,
            });

            // Track tool results for conversation history
            if (agentId === this.mainAgentId) {
              const resultStr =
                typeof block.content === "string"
                  ? block.content
                  : JSON.stringify(block.content);
              const truncatedResult =
                resultStr.length > 300
                  ? `${resultStr.slice(0, 300)}...`
                  : resultStr;
              this.lastTurnAssistantParts.push(
                `[Tool result${block.is_error ? " (error)" : ""}: ${truncatedResult}]`,
              );
            }

            this.pushEvent({
              type: "tool_result",
              taskId: this.taskId,
              agentId,
              data: {
                toolCallId: block.tool_use_id,
                result: block.content,
                isError: block.is_error,
              },
              timestamp: new Date(),
            });

            // Complete the child agent if this was a Task tool result
            if (childAgentId) {
              logger.info("sdk", "Completing child agent", {
                taskId: this.taskId,
                childAgentId,
              });
              this.pushEvent({
                type: "agent_completed",
                taskId: this.taskId,
                agentId: childAgentId,
                data: {
                  status: "completed",
                },
                timestamp: new Date(),
              });
            }
          }
        }
        break;

      case "result":
        // Track the current cost
        const totalCost =
          message.total_cost_usd ||
          message.usage?.total_cost_usd ||
          this.currentCost;
        this.currentCost = totalCost;

        logger.info("cost", "Final cost update", {
          taskId: this.taskId,
          agentId,
          cost: this.currentCost,
        });
        this.pushEvent({
          type: "cost_update",
          taskId: this.taskId,
          agentId,
          data: {
            cost: totalCost,
            totalCost,
          },
          timestamp: new Date(),
        });
        break;
    }
  }

  private waitForApprovalDecision(
    approvalId: string,
  ): Promise<"allow" | "deny"> {
    return new Promise((resolve) => {
      this.pendingApprovals.set(approvalId, { resolve });
    });
  }
}
