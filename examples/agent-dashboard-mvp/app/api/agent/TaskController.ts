/**
 * TaskController manages a single task execution with the real SDK.
 * This runs on the server and uses the real Claude Agent SDK.
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import { nanoid } from "nanoid";
import type { SDKEvent, CreateTaskOptions } from "@assistant-ui/react-agent";

export class TaskController {
  private taskId: string;
  private options: CreateTaskOptions;
  private eventQueue: SDKEvent[] = [];
  private pendingApprovals: Map<
    string,
    { resolve: (decision: "allow" | "deny") => void }
  > = new Map();
  private isRunning = false;
  private isCancelled = false;
  private eventListeners: Set<() => void> = new Set();
  private abortController: AbortController | null = null;

  constructor(taskId: string, options: CreateTaskOptions) {
    this.taskId = taskId;
    this.options = options;
  }

  start(): void {
    this.isRunning = true;
    this.abortController = new AbortController();
    this.runTask();
  }

  cancel(): void {
    this.isCancelled = true;
    this.isRunning = false;
    this.abortController?.abort();
    this.pushEvent({
      type: "task_failed",
      taskId: this.taskId,
      data: { reason: "cancelled" },
      timestamp: new Date(),
    });
  }

  resolveApproval(approvalId: string, decision: "allow" | "deny"): void {
    const pending = this.pendingApprovals.get(approvalId);
    if (pending) {
      pending.resolve(decision);
      this.pendingApprovals.delete(approvalId);
    }
  }

  async *events(): AsyncGenerator<SDKEvent> {
    while (this.isRunning || this.eventQueue.length > 0) {
      if (this.eventQueue.length > 0) {
        yield this.eventQueue.shift()!;
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
    this.eventQueue.push(event);
    this.eventListeners.forEach((listener) => listener());
  }

  private async runTask(): Promise<void> {
    const agentId = `agent_${nanoid()}`;

    try {
      // Emit task started
      this.pushEvent({
        type: "task_started",
        taskId: this.taskId,
        data: { prompt: this.options.prompt },
        timestamp: new Date(),
      });

      // Emit agent spawned
      this.pushEvent({
        type: "agent_spawned",
        taskId: this.taskId,
        agentId,
        data: { name: "Claude", parentAgentId: null },
        timestamp: new Date(),
      });

      // Run the real SDK query
      for await (const message of query({
        prompt: this.options.prompt,
        options: {
          model: "sonnet",
          allowedTools: this.options.allowedTools || [
            "Read",
            "Write",
            "Edit",
            "Bash",
            "Glob",
            "Grep",
          ],
          maxTurns: this.options.maxTurns || 250,
          // Custom permission handler for approval flow
          canUseTool: async (toolName, input) => {
            // All tools require approval in this supervised mode
            const approvalId = `approval_${nanoid()}`;
            const toolCallId = `tool_${nanoid()}`;

            // Emit approval request
            this.pushEvent({
              type: "tool_use_requested",
              taskId: this.taskId,
              agentId,
              data: {
                approvalId,
                toolCallId,
                toolName,
                toolInput: input,
                reason: `Agent wants to use ${toolName}`,
              },
              timestamp: new Date(),
            });

            // Wait for human decision
            const decision = await this.waitForApprovalDecision(approvalId);

            if (decision === "deny") {
              this.pushEvent({
                type: "tool_use_denied",
                taskId: this.taskId,
                agentId,
                data: { approvalId, toolCallId },
                timestamp: new Date(),
              });
              return {
                behavior: "deny" as const,
                message: "User denied this tool execution",
              };
            }

            this.pushEvent({
              type: "tool_use_approved",
              taskId: this.taskId,
              agentId,
              data: { approvalId, toolCallId },
              timestamp: new Date(),
            });

            return { behavior: "allow" as const, updatedInput: input };
          },
        },
      })) {
        if (this.isCancelled) break;

        // Convert SDK messages to our event format
        this.processSDKMessage(message, agentId);
      }

      if (!this.isCancelled) {
        // Emit agent completed
        this.pushEvent({
          type: "agent_completed",
          taskId: this.taskId,
          agentId,
          data: { finalCost: 0 },
          timestamp: new Date(),
        });

        // Emit task completed
        this.pushEvent({
          type: "task_completed",
          taskId: this.taskId,
          data: { totalCost: 0 },
          timestamp: new Date(),
        });
      }
    } catch (error) {
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

  private processSDKMessage(message: any, agentId: string): void {
    switch (message.type) {
      case "system":
        if (message.subtype === "init") {
          // Session initialized
          this.pushEvent({
            type: "system_init",
            taskId: this.taskId,
            data: {
              sessionId: message.session_id,
              tools: message.tools,
            },
            timestamp: new Date(),
          });
        }
        break;

      case "assistant":
        // Process assistant message content
        for (const block of message.message?.content || []) {
          if ("text" in block) {
            this.pushEvent({
              type: "message",
              taskId: this.taskId,
              agentId,
              data: { text: block.text },
              timestamp: new Date(),
            });
          } else if ("name" in block) {
            // Tool use
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
          }
        }
        break;

      case "result":
        // Final result with cost info
        this.pushEvent({
          type: "cost_update",
          taskId: this.taskId,
          agentId,
          data: {
            cost: message.total_cost_usd || 0,
            totalCost: message.total_cost_usd || 0,
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
