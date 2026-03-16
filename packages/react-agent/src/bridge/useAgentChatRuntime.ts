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
type BridgeContentPart =
  | { readonly type: "text"; readonly text: string }
  | { readonly type: "reasoning"; readonly text: string }
  | {
      readonly type: "tool-call";
      readonly toolCallId: string;
      readonly toolName: string;
      readonly args: Record<string, unknown>;
      readonly argsText: string;
      readonly result?: unknown;
      readonly isError?: boolean;
    };

type BridgeRunResult = {
  readonly content?: ReadonlyArray<BridgeContentPart>;
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
        // IMPORTANT: Each yield REPLACES the previous content (not appends).
        // We must accumulate all content parts ourselves and yield the
        // full array each time. See assistant-ui's OpenAI adapter example.
        const parts: BridgeContentPart[] = [];
        let textPartIndex = -1; // index of the current text part being streamed
        let reasoningPartIndex = -1; // index of the current reasoning part

        for await (const event of queue) {
          switch (event.type) {
            case "message": {
              const c = event.content as { text: string };
              if (textPartIndex >= 0) {
                // Append to existing text part
                const existing = parts[textPartIndex] as {
                  type: "text";
                  text: string;
                };
                parts[textPartIndex] = {
                  type: "text" as const,
                  text: existing.text + c.text,
                };
              } else {
                // Create new text part
                textPartIndex = parts.length;
                parts.push({ type: "text" as const, text: c.text });
              }
              yield { content: [...parts] };
              break;
            }
            case "reasoning": {
              const c = event.content as { text: string };
              if (reasoningPartIndex >= 0) {
                const existing = parts[reasoningPartIndex] as {
                  type: "reasoning";
                  text: string;
                };
                parts[reasoningPartIndex] = {
                  type: "reasoning" as const,
                  text: existing.text + c.text,
                };
              } else {
                reasoningPartIndex = parts.length;
                parts.push({ type: "reasoning" as const, text: c.text });
              }
              yield { content: [...parts] };
              break;
            }
            case "tool_call": {
              const c = event.content as {
                toolCallId: string;
                toolName: string;
                toolInput: unknown;
              };
              // Reset text part index — new text after tool call is a new part
              textPartIndex = -1;
              parts.push({
                type: "tool-call" as const,
                toolCallId: c.toolCallId,
                toolName: c.toolName,
                args: c.toolInput as Record<string, unknown>,
                argsText: JSON.stringify(c.toolInput),
              });
              yield { content: [...parts] };
              break;
            }
            case "tool_result": {
              const c = event.content as {
                toolCallId: string;
                result: unknown;
                isError?: boolean;
              };
              // Update the matching tool-call part with its result
              for (let i = parts.length - 1; i >= 0; i--) {
                const p = parts[i]!;
                if (p.type === "tool-call" && p.toolCallId === c.toolCallId) {
                  parts[i] = {
                    ...p,
                    ...(c.result !== undefined ? { result: c.result } : {}),
                    ...(c.isError !== undefined ? { isError: c.isError } : {}),
                  };
                  break;
                }
              }
              yield { content: [...parts] };
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
