/// <reference types="@assistant-ui/core/store" />
"use client";

import { useMemo, useRef, useState } from "react";
import type { AppendMessage, ToolExecutionStatus } from "@assistant-ui/core";
import { pickExternalStoreSharedOptions } from "@assistant-ui/core";
import {
  useCloudThreadListAdapter,
  useExternalStoreRuntime,
  useExternalMessageConverter,
  useRemoteThreadListRuntime,
} from "@assistant-ui/core/react";
import { useAuiState } from "@assistant-ui/store";
import { useStream } from "@langchain/react";
import type {
  LangChainBaseMessage,
  LangChainToolCall,
  UseStreamRuntimeOptions,
} from "./types";
import {
  convertLangChainBaseMessage,
  getMessageContent,
  getMessageType,
} from "./convertMessages";
import { langChainExtras } from "./runtimeExtras";

export const runConfigToSubmitOptions = (
  runConfig: AppendMessage["runConfig"],
) =>
  runConfig?.custom
    ? { config: { configurable: runConfig.custom } }
    : undefined;

const getPendingToolCalls = (
  messages: readonly LangChainBaseMessage[],
): LangChainToolCall[] => {
  const pending = new Map<string, LangChainToolCall>();
  for (const m of messages) {
    const type = getMessageType(m);
    if (type === "ai") {
      for (const tc of m.tool_calls ?? []) pending.set(tc.id, tc);
    } else if (type === "tool" && m.tool_call_id) {
      pending.delete(m.tool_call_id);
    }
  }
  return [...pending.values()];
};

type DistributiveOmit<T, K extends keyof any> = T extends unknown
  ? Omit<T, K>
  : never;

const useStreamThreadRuntime = (
  options: DistributiveOmit<
    UseStreamRuntimeOptions,
    "cloud" | "unstable_threadListAdapter" | "create" | "delete"
  >,
) => {
  const { adapters, autoCancelPendingToolCalls, unstable_allowCancellation } =
    options;
  const messagesKey = options.messagesKey ?? "messages";

  const externalId = useAuiState((s) => s.threadListItem.externalId) as
    | string
    | null;
  // Mutate in place rather than `{ ...options, threadId }`: spreading
  // `UseStreamOptions` (a discriminated union on `transport`) into an object
  // literal merges both arms' transport types, breaking arm assignment.
  options.threadId = externalId;

  const stream = useStream(options);

  const [toolStatuses, setToolStatuses] = useState<
    Record<string, ToolExecutionStatus>
  >({});
  const hasExecutingTools = Object.values(toolStatuses).some(
    (s) => s?.type === "executing",
  );
  const effectiveIsRunning = stream.isLoading || hasExecutingTools;

  const threadMessages = useExternalMessageConverter({
    callback: convertLangChainBaseMessage,
    messages: stream.messages as LangChainBaseMessage[],
    isRunning: effectiveIsRunning,
  });

  const streamRef = useRef(stream);
  streamRef.current = stream;

  const extras = useMemo(
    () =>
      langChainExtras.provide({
        interrupt: stream.interrupt,
        interrupts: stream.interrupts,
        toolCalls: stream.toolCalls,
        error: stream.error,
        submit: stream.submit,
        respond: stream.respond,
        respondAll: stream.respondAll,
        values: stream.values,
        messagesKey,
      }),
    [
      stream.interrupt,
      stream.interrupts,
      stream.toolCalls,
      stream.error,
      stream.submit,
      stream.respond,
      stream.respondAll,
      stream.values,
      messagesKey,
    ],
  );

  const runtime = useExternalStoreRuntime({
    ...pickExternalStoreSharedOptions(options),
    isRunning: effectiveIsRunning,
    isLoading: stream.isThreadLoading,
    messages: threadMessages,
    adapters,
    extras,
    unstable_enableToolInvocations: true,
    setToolStatuses,
    onNew: async (msg) => {
      const content = getMessageContent(msg);
      const cancellations =
        autoCancelPendingToolCalls !== false
          ? getPendingToolCalls(
              streamRef.current.messages as readonly LangChainBaseMessage[],
            ).map((t) => ({
              type: "tool" as const,
              name: t.name,
              tool_call_id: t.id,
              content: JSON.stringify({ cancelled: true }),
              status: "error" as const,
            }))
          : [];
      await stream.submit(
        { [messagesKey]: [...cancellations, { type: "human", content }] },
        runConfigToSubmitOptions(msg.runConfig),
      );
    },
    onAddToolResult: async ({
      toolCallId,
      toolName,
      result,
      isError,
      artifact,
    }) => {
      await stream.submit({
        [messagesKey]: [
          {
            type: "tool",
            name: toolName,
            tool_call_id: toolCallId,
            content: JSON.stringify(result),
            ...(artifact !== undefined && { artifact }),
            status: isError ? "error" : "success",
          },
        ],
      });
    },
    onCancel:
      unstable_allowCancellation !== false
        ? async () => {
            await stream.stop();
          }
        : undefined,
  });

  return runtime;
};

/**
 * Creates an assistant-ui runtime backed by LangChain's `useStream` hook.
 * Accepts the same options as `useStream` from `@langchain/react`, plus
 * `cloud` and `adapters`.
 *
 * @example
 * ```tsx
 * import { useStreamRuntime } from "@assistant-ui/react-langchain";
 * import { AssistantRuntimeProvider, Thread } from "@assistant-ui/react";
 *
 * function App() {
 *   const runtime = useStreamRuntime({
 *     assistantId: "agent",
 *     apiUrl: "http://localhost:2024",
 *   });
 *
 *   return (
 *     <AssistantRuntimeProvider runtime={runtime}>
 *       <Thread />
 *     </AssistantRuntimeProvider>
 *   );
 * }
 * ```
 */
export const useStreamRuntime = (rawOptions: UseStreamRuntimeOptions) => {
  const {
    cloud,
    unstable_threadListAdapter,
    create,
    delete: deleteFn,
    ...options
  } = rawOptions;

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const cloudAdapter = useCloudThreadListAdapter({
    cloud,
    create,
    delete: deleteFn,
  });
  const adapter = unstable_threadListAdapter ?? cloudAdapter;

  return useRemoteThreadListRuntime({
    runtimeHook: function RuntimeHook() {
      return useStreamThreadRuntime(optionsRef.current);
    },
    adapter,
    allowNesting: true,
  });
};
