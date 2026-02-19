/**
 * Wrapper for the Anthropic Agents SDK.
 * Uses the real @anthropic-ai/claude-agent-sdk for agent execution.
 *
 * NOTE: This client requires Node.js runtime and CANNOT run in the browser.
 * Use HttpAgentClient for browser environments.
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import { nanoid } from "nanoid";
import type { AgentClientInterface } from "./HttpAgentClient";
import type {
  AgentClientConfig,
  CreateTaskOptions,
  SDKEvent,
  TaskHandle,
} from "../runtime/types";

export class AnthropicAgentClient implements AgentClientInterface {
  private config: AgentClientConfig;
  private activeTasks: Map<string, TaskController> = new Map();

  constructor(config: AgentClientConfig) {
    this.config = config;
  }

  async createTask(options: CreateTaskOptions): Promise<TaskHandle> {
    const taskId = `task_${nanoid()}`;
    const handle: TaskHandle = {
      id: taskId,
      prompt: options.prompt,
    };

    const controller = new TaskController(taskId, options, this.config);
    this.activeTasks.set(taskId, controller);
    controller.start();

    return handle;
  }

  async *streamEvents(taskId: string): AsyncGenerator<SDKEvent> {
    const controller = this.activeTasks.get(taskId);
    if (!controller) {
      throw new Error(`Task not found: ${taskId}`);
    }

    for await (const event of controller.events()) {
      yield event;
    }
  }

  async approveToolUse(
    taskId: string,
    approvalId: string,
    decision: "allow" | "deny",
  ): Promise<void> {
    const controller = this.activeTasks.get(taskId);
    if (!controller) {
      throw new Error(`Task not found: ${taskId}`);
    }

    controller.resolveApproval(approvalId, decision);
  }

  async cancelTask(taskId: string): Promise<void> {
    const controller = this.activeTasks.get(taskId);
    if (controller) {
      controller.cancel();
      this.activeTasks.delete(taskId);
    }
  }
}

/**
 * Controls a single task execution using the real Claude Agent SDK.
 */
class TaskController {
  private taskId: string;
  private options: CreateTaskOptions;
  private config: AgentClientConfig;
  private eventQueue: SDKEvent[] = [];
  private pendingApprovals: Map<
    string,
    { resolve: (decision: "allow" | "deny") => void }
  > = new Map();
  private isRunning = false;
  private isCancelled = false;
  private eventListeners: Set<() => void> = new Set();
  private abortController: AbortController | null = null;

  constructor(
    taskId: string,
    options: CreateTaskOptions,
    config: AgentClientConfig,
  ) {
    this.taskId = taskId;
    this.options = options;
    this.config = config;
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
          model: this.config.model || "sonnet",
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
            // Check if this tool requires approval
            if (this.options.requiresApproval?.(toolName, input)) {
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
            }

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
