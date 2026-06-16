/// <reference types="@assistant-ui/core/store" />
"use client";

import { useMemo, useRef, useState } from "react";
import type {
  AppendMessage,
  AttachmentAdapter,
  DictationAdapter,
  ExternalStoreSharedOptions,
  FeedbackAdapter,
  RealtimeVoiceAdapter,
  RemoteThreadListAdapter,
  SpeechSynthesisAdapter,
  ToolExecutionStatus,
} from "@assistant-ui/core";
import { pickExternalStoreSharedOptions } from "@assistant-ui/core";
import {
  useCloudThreadListAdapter,
  useExternalStoreRuntime,
  useExternalMessageConverter,
  useRemoteThreadListRuntime,
} from "@assistant-ui/core/react";
import { useAui, useAuiState } from "@assistant-ui/store";
import type { AssistantCloud } from "assistant-cloud";
import { useStream, type UseStreamOptions } from "@langchain/react";
import type { LangChainBaseMessage, LangChainToolCall } from "./types";
import { convertLangChainBaseMessage, getMessageType } from "./convertMessages";

const symbolLangChainRuntimeExtras = Symbol("langchain-runtime-extras");

type LangChainRuntimeExtras = {
  [symbolLangChainRuntimeExtras]: true;
  interrupt: { value?: unknown } | undefined;
  interrupts: readonly { value?: unknown }[];
  submit: (
    values: Record<string, unknown> | null | undefined,
    options?: Record<string, unknown>,
  ) => Promise<void>;
  values: Record<string, unknown>;
  messagesKey: string;
};

const asLangChainRuntimeExtras = (extras: unknown): LangChainRuntimeExtras => {
  if (
    typeof extras !== "object" ||
    extras == null ||
    !(symbolLangChainRuntimeExtras in extras)
  )
    throw new Error(
      "This method can only be called when you are using useStreamRuntime",
    );
  return extras as LangChainRuntimeExtras;
};

type LangChainRuntimeExtraOptions = ExternalStoreSharedOptions & {
  cloud?: AssistantCloud | undefined;
  adapters?:
    | {
        attachments?: AttachmentAdapter | undefined;
        speech?: SpeechSynthesisAdapter | undefined;
        dictation?: DictationAdapter | undefined;
        voice?: RealtimeVoiceAdapter | undefined;
        feedback?: FeedbackAdapter | undefined;
      }
    | undefined;
  /**
   * When the user sends a new message while previous tool calls are
   * still pending, automatically submit `tool` messages that cancel
   * them so the agent's tool-call accounting stays consistent.
   * Defaults to `true`.
   */
  autoCancelPendingToolCalls?: boolean | undefined;
  /**
   * Routes the Cancel button's click to `useStream().stop()`. On by
   * default. Pass `false` to disable the Cancel button.
   */
  unstable_allowCancellation?: boolean | undefined;
  /**
   * Custom `RemoteThreadListAdapter`. When provided, replaces the
   * cloud-backed thread list adapter.
   */
  unstable_threadListAdapter?: RemoteThreadListAdapter | undefined;
  /** Custom thread-creation hook, forwarded to the cloud adapter. */
  create?: (() => Promise<{ externalId: string | undefined }>) | undefined;
  /** Custom thread-deletion hook, forwarded to the cloud adapter. */
  delete?: ((threadId: string) => Promise<void>) | undefined;
};

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

// Distribute the intersection through the union arms of `UseStreamOptions`
// (`AgentServerOptions | CustomAdapterOptions`). Writing `UseStreamOptions & X`
// directly collapses arm tracking, so `Omit<…, "cloud">` and the like would
// produce a flattened structural type that no longer matches either arm.
export type UseStreamRuntimeOptions = UseStreamOptions extends infer O
  ? O extends UseStreamOptions
    ? O & LangChainRuntimeExtraOptions
    : never
  : never;

const getMessageContent = (msg: AppendMessage) => {
  const allContent = [
    ...msg.content,
    ...(msg.attachments?.flatMap((a) => a.content) ?? []),
  ];

  const hasNonText = allContent.some(
    (part) => part.type === "file" || part.type === "image",
  );
  const hasText = allContent.some((part) => part.type === "text");
  if (hasNonText && !hasText) {
    allContent.unshift({ type: "text", text: " " });
  }

  const content = allContent.map((part) => {
    const type = part.type;
    switch (type) {
      case "text":
        return { type: "text" as const, text: part.text };
      case "image":
        return { type: "image_url" as const, image_url: { url: part.image } };
      case "file":
        return {
          type: "file" as const,
          data: part.data,
          mime_type: part.mimeType,
          metadata: { filename: part.filename ?? "file" },
          source_type: "base64" as const,
        };
      case "tool-call":
        throw new Error("Tool call appends are not supported.");
      default: {
        const _exhaustiveCheck:
          | "reasoning"
          | "source"
          | "audio"
          | "data"
          | "generative-ui" = type;
        throw new Error(
          `Unsupported append message part type: ${_exhaustiveCheck}`,
        );
      }
    }
  });

  if (content.length === 1 && content[0]?.type === "text") {
    return content[0].text ?? "";
  }
  return content;
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
    (): LangChainRuntimeExtras => ({
      [symbolLangChainRuntimeExtras]: true,
      interrupt: stream.interrupt,
      interrupts: stream.interrupts,
      submit: stream.submit,
      values: stream.values,
      messagesKey,
    }),
    [
      stream.interrupt,
      stream.interrupts,
      stream.submit,
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
      await stream.submit({
        [messagesKey]: [...cancellations, { type: "human", content }],
      });
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

/**
 * Read the current LangGraph interrupt state from the runtime extras.
 */
export const useLangChainInterruptState = () => {
  return useAuiState((s) => {
    const extras = s.thread.extras;
    if (!extras) return undefined;
    return asLangChainRuntimeExtras(extras).interrupt;
  });
};

/**
 * Returns a function to submit raw state updates to the LangGraph agent,
 * bypassing the normal message flow. Useful for sending interrupt resume
 * commands.
 */
export const useLangChainSubmit = () => {
  const aui = useAui();
  return (
    values: Record<string, unknown> | null | undefined,
    options?: Record<string, unknown>,
  ) => {
    const extras = aui.thread().getState().extras;
    const { submit } = asLangChainRuntimeExtras(extras);
    return submit(values, options);
  };
};

/**
 * Submit a list of LangChain-shaped messages on the current thread.
 * Parity helper for migrating from `useLangGraphSend`. Routes to
 * `useStream().submit({ [messagesKey]: messages }, options)`.
 */
export const useLangChainSend = () => {
  const aui = useAui();
  return (
    messages: readonly LangChainBaseMessage[],
    options?: Record<string, unknown>,
  ) => {
    const { submit, messagesKey } = asLangChainRuntimeExtras(
      aui.thread().getState().extras,
    );
    return submit({ [messagesKey]: messages }, options);
  };
};

/**
 * Submit a `useStream` command (e.g. interrupt resume). Parity helper
 * for migrating from `useLangGraphSendCommand`. Note that v1's command
 * shape (`{ resume?, goto?, update? }`) differs from the legacy
 * `{ resume: string }` form — to carry a payload, use the input or
 * `stream.respond` instead.
 */
export const useLangChainSendCommand = () => {
  const submit = useLangChainSubmit();
  return (command: Record<string, unknown>) => submit(null, { command });
};

/**
 * Read a custom LangGraph state key from the current thread. Mirrors
 * `useStream().values[key]` from `@langchain/react` and updates when the
 * stream emits new state.
 *
 * @example
 * ```tsx
 * const todos = useLangChainState<Todo[]>("todos");
 * const files = useLangChainState<Record<string, string>>("files", {});
 * ```
 */
export function useLangChainState<T>(key: string): T | undefined;
export function useLangChainState<T>(key: string, defaultValue: T): T;
export function useLangChainState<T>(
  key: string,
  defaultValue?: T,
): T | undefined {
  return useAuiState((s) => {
    const extras = s.thread.extras;
    if (!extras) return defaultValue;
    const value = asLangChainRuntimeExtras(extras).values[key] as T | undefined;
    return value !== undefined ? value : defaultValue;
  });
}
