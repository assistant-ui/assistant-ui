import { useRef } from "react";
import type { WorkspaceRuntime } from "../runtime/WorkspaceRuntime";
import { AsyncEventQueue } from "./AsyncEventQueue";
import type { AgentEvent } from "../runtime/types";

/**
 * Minimal subset of ChatModelRunOptions needed by the bridge.
 * Mirrors the type from @assistant-ui/core without requiring a dependency.
 */
type BridgeRunOptions = {
  readonly messages: ReadonlyArray<{
    role: string;
    content: ReadonlyArray<{ type: string; text?: string }>;
  }>;
  readonly abortSignal: AbortSignal;
  readonly [key: string]: unknown;
};

/**
 * Minimal ChatModelRunResult shape matching @assistant-ui/core.
 */
type BridgeRunResult = {
  readonly content?: ReadonlyArray<{
    type: string;
    text?: string;
    toolCallId?: string;
    toolName?: string;
    args?: Record<string, unknown>;
    argsText?: string;
    result?: unknown;
    isError?: boolean;
  }>;
  readonly status?: {
    type: "complete" | "incomplete" | "requires-action" | "running";
    reason?: string;
    error?: unknown;
  };
  readonly metadata?: {
    readonly custom?: Record<string, unknown>;
    readonly [key: string]: unknown;
  };
};

/**
 * Minimal ChatModelAdapter shape matching @assistant-ui/core.
 */
export type ChatModelAdapter = {
  run(
    options: BridgeRunOptions,
  ): Promise<BridgeRunResult> | AsyncGenerator<BridgeRunResult, void>;
};

export function useAgentChatRuntime(
  workspace: WorkspaceRuntime,
  options?: { model?: string; maxTokens?: number },
): ChatModelAdapter {
  const workspaceRef = useRef(workspace);
  workspaceRef.current = workspace;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const adapter = useRef<ChatModelAdapter>({
    async *run(
      chatOptions: BridgeRunOptions,
    ): AsyncGenerator<BridgeRunResult, void> {
      // 1. Extract last user message text
      const lastMessage = chatOptions.messages[chatOptions.messages.length - 1];
      const prompt =
        lastMessage?.role === "user"
          ? lastMessage.content
              .filter((p) => p.type === "text")
              .map((p) => p.text ?? "")
              .join("\n")
          : "";

      // 2. Create task
      const taskOpts: Parameters<WorkspaceRuntime["createTask"]>[1] = {};
      if (optionsRef.current?.model !== undefined)
        taskOpts.model = optionsRef.current.model;
      if (optionsRef.current?.maxTokens !== undefined)
        taskOpts.maxTokens = optionsRef.current.maxTokens;
      const task = await workspaceRef.current.createTask(prompt, taskOpts);

      // 3. Create async event queue
      const queue = new AsyncEventQueue<AgentEvent>();

      // 4. Subscribe to per-event notifications
      const unsub = task.subscribeToEvents((event) => queue.push(event));

      // 5. Wire abort signal
      const onAbort = () => {
        task.cancel();
        queue.close();
      };
      chatOptions.abortSignal.addEventListener("abort", onAbort);

      try {
        // 6. Iterate events and yield BridgeRunResult
        for await (const event of queue) {
          switch (event.type) {
            case "message": {
              const c = event.content as { text: string };
              yield { content: [{ type: "text" as const, text: c.text }] };
              break;
            }
            case "reasoning": {
              const c = event.content as { text: string };
              yield { content: [{ type: "reasoning" as const, text: c.text }] };
              break;
            }
            case "tool_call": {
              const c = event.content as {
                toolCallId: string;
                toolName: string;
                toolInput: unknown;
              };
              yield {
                content: [
                  {
                    type: "tool-call" as const,
                    toolCallId: c.toolCallId,
                    toolName: c.toolName,
                    args: c.toolInput as Record<string, unknown>,
                    argsText: JSON.stringify(c.toolInput),
                  },
                ],
              };
              break;
            }
            case "tool_result": {
              const c = event.content as {
                toolCallId: string;
                result: unknown;
                isError?: boolean;
              };
              const toolResultPart: Record<string, unknown> = {
                type: "tool-call",
                toolCallId: c.toolCallId,
                toolName: "",
                args: {},
                argsText: "",
                result: c.result,
              };
              if (c.isError !== undefined) toolResultPart.isError = c.isError;
              yield {
                content: [
                  toolResultPart as {
                    type: "tool-call";
                    toolCallId: string;
                    toolName: string;
                    args: Record<string, unknown>;
                    argsText: string;
                    result?: unknown;
                    isError?: boolean;
                  },
                ],
              };
              break;
            }
            case "error": {
              const c = event.content as { message: string };
              yield {
                status: {
                  type: "incomplete" as const,
                  reason: "error" as const,
                  error: c.message,
                },
              };
              queue.close();
              break;
            }
            case "task_completed": {
              yield {
                status: { type: "complete" as const, reason: "stop" as const },
              };
              queue.close();
              break;
            }
            default: {
              // Approval pending, plan proposed, etc. — expose via metadata
              const taskState = task.getState();
              if (taskState.pendingApprovals.length > 0) {
                yield {
                  status: {
                    type: "requires-action" as const,
                    reason: "tool-calls" as const,
                  },
                  metadata: {
                    custom: { approvals: taskState.pendingApprovals },
                  },
                };
              }
              if (taskState.proposedPlan?.status === "proposed") {
                yield {
                  status: {
                    type: "requires-action" as const,
                    reason: "interrupt" as const,
                  },
                  metadata: { custom: { plan: taskState.proposedPlan } },
                };
              }
              break;
            }
          }
        }
      } finally {
        unsub();
        chatOptions.abortSignal.removeEventListener("abort", onAbort);
      }
    },
  });

  return adapter.current;
}
