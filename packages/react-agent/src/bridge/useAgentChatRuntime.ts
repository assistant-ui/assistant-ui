import { useRef } from "react";
import type { WorkspaceRuntime } from "../runtime/WorkspaceRuntime";
import { AsyncEventQueue } from "./AsyncEventQueue";
import type { AgentEvent, TaskState, TaskStatus } from "../runtime/types";

type BridgeRunOptions = {
  readonly messages: ReadonlyArray<{
    role: string;
    content: ReadonlyArray<{ type: string; text?: string }>;
  }>;
  readonly abortSignal: AbortSignal;
  readonly unstable_threadId?: string;
  readonly [key: string]: unknown;
};

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

export type ChatModelAdapter = {
  run(
    options: BridgeRunOptions,
  ): Promise<BridgeRunResult> | AsyncGenerator<BridgeRunResult, void>;
};

export type UseAgentChatRuntimeOptions = {
  model?: string;
  maxTokens?: number;
  threadId?: string;
};

const ACTIVE_TASK_STATUSES = new Set<TaskStatus>([
  "starting",
  "running",
  "waiting_input",
  "interrupting",
]);

const isTaskActive = (status: TaskStatus) => ACTIVE_TASK_STATUSES.has(status);

const applyEventToParts = (
  event: AgentEvent,
  parts: BridgeContentPart[],
  refs: { textPartIndex: number; reasoningPartIndex: number },
) => {
  switch (event.type) {
    case "message": {
      const c = event.content as { text: string };
      if (refs.textPartIndex >= 0) {
        const existing = parts[refs.textPartIndex] as {
          type: "text";
          text: string;
        };
        parts[refs.textPartIndex] = {
          type: "text",
          text: existing.text + c.text,
        };
      } else {
        refs.textPartIndex = parts.length;
        parts.push({ type: "text", text: c.text });
      }
      break;
    }
    case "reasoning": {
      const c = event.content as { text: string };
      if (refs.reasoningPartIndex >= 0) {
        const existing = parts[refs.reasoningPartIndex] as {
          type: "reasoning";
          text: string;
        };
        parts[refs.reasoningPartIndex] = {
          type: "reasoning",
          text: existing.text + c.text,
        };
      } else {
        refs.reasoningPartIndex = parts.length;
        parts.push({ type: "reasoning", text: c.text });
      }
      break;
    }
    case "tool_call": {
      const c = event.content as {
        toolCallId: string;
        toolName: string;
        toolInput: unknown;
      };
      refs.textPartIndex = -1;
      parts.push({
        type: "tool-call",
        toolCallId: c.toolCallId,
        toolName: c.toolName,
        args: c.toolInput as Record<string, unknown>,
        argsText: JSON.stringify(c.toolInput),
      });
      break;
    }
    case "tool_result": {
      const c = event.content as {
        toolCallId: string;
        result: unknown;
        isError?: boolean;
      };
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
      break;
    }
    default:
      break;
  }
};

const getInitialResults = (
  taskState: TaskState,
  events: readonly AgentEvent[],
  parts: BridgeContentPart[],
  refs: { textPartIndex: number; reasoningPartIndex: number },
): BridgeRunResult[] => {
  for (const event of events) {
    applyEventToParts(event, parts, refs);
  }

  const results: BridgeRunResult[] = [];
  if (parts.length > 0) {
    results.push({ content: [...parts] });
  }

  if (taskState.pendingApprovals.length > 0) {
    results.push({
      status: {
        type: "requires-action",
        reason: "tool-calls",
      },
      metadata: {
        custom: { approvals: taskState.pendingApprovals },
      },
    });
  }

  if (taskState.proposedPlan?.status === "proposed") {
    results.push({
      status: {
        type: "requires-action",
        reason: "interrupt",
      },
      metadata: { custom: { plan: taskState.proposedPlan } },
    });
  }

  return results;
};

export function createAgentChatAdapter(
  workspace: WorkspaceRuntime,
  options?: UseAgentChatRuntimeOptions,
): ChatModelAdapter {
  return {
    async *run(
      chatOptions: BridgeRunOptions,
    ): AsyncGenerator<BridgeRunResult, void> {
      const lastMessage = chatOptions.messages[chatOptions.messages.length - 1];
      const prompt =
        lastMessage?.role === "user"
          ? lastMessage.content
              .filter((p) => p.type === "text")
              .map((p) => p.text ?? "")
              .join("\n")
          : "";

      const threadId = chatOptions.unstable_threadId ?? options?.threadId;
      const existingTask = threadId
        ? workspace.getTaskByThreadId(threadId)
        : null;
      const taskOptions = {
        ...(options?.model !== undefined ? { model: options.model } : {}),
        ...(options?.maxTokens !== undefined
          ? { maxTokens: options.maxTokens }
          : {}),
      };
      const task =
        existingTask && isTaskActive(existingTask.getState().status)
          ? existingTask
          : threadId
            ? await workspace.createThreadTask(threadId, prompt, taskOptions)
            : await workspace.createTask(prompt, taskOptions);

      const queue = new AsyncEventQueue<AgentEvent>();
      const unsub = task.subscribeToEvents((event) => queue.push(event));

      const onAbort = () => {
        const reason = chatOptions.abortSignal.reason as
          | { detach?: boolean }
          | undefined;
        if (!reason?.detach) {
          void task.cancel();
        }
        queue.close();
      };
      chatOptions.abortSignal.addEventListener("abort", onAbort);

      try {
        const parts: BridgeContentPart[] = [];
        const refs = { textPartIndex: -1, reasoningPartIndex: -1 };
        const initialResults = getInitialResults(
          task.getState(),
          task.getEventHistory(),
          parts,
          refs,
        );

        for (const result of initialResults) {
          yield result;
        }

        for await (const event of queue) {
          switch (event.type) {
            case "message":
            case "reasoning":
            case "tool_call":
            case "tool_result": {
              applyEventToParts(event, parts, refs);
              yield { content: [...parts] };
              break;
            }
            case "error": {
              const c = event.content as { message: string };
              yield {
                status: {
                  type: "incomplete",
                  reason: "error",
                  error: c.message,
                },
              };
              queue.close();
              break;
            }
            case "task_completed": {
              yield {
                status: { type: "complete", reason: "stop" },
              };
              queue.close();
              break;
            }
            default: {
              const taskState = task.getState();
              if (taskState.pendingApprovals.length > 0) {
                yield {
                  status: {
                    type: "requires-action",
                    reason: "tool-calls",
                  },
                  metadata: {
                    custom: { approvals: taskState.pendingApprovals },
                  },
                };
              }
              if (taskState.proposedPlan?.status === "proposed") {
                yield {
                  status: {
                    type: "requires-action",
                    reason: "interrupt",
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
  };
}

export function useAgentChatRuntime(
  workspace: WorkspaceRuntime,
  options?: UseAgentChatRuntimeOptions,
): ChatModelAdapter {
  const workspaceRef = useRef(workspace);
  workspaceRef.current = workspace;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const adapter = useRef<ChatModelAdapter>({
    run(chatOptions) {
      return createAgentChatAdapter(
        workspaceRef.current,
        optionsRef.current,
      ).run(chatOptions);
    },
  });

  return adapter.current;
}
