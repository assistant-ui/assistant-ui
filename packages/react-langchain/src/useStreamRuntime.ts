/// <reference types="@assistant-ui/core/store" />
"use client";

import { useMemo, useRef, useState } from "react";
import type { AppendMessage, ToolExecutionStatus } from "@assistant-ui/core";
import {
  generateId,
  getExternalStoreMessages,
  pickExternalStoreSharedOptions,
} from "@assistant-ui/core";
import type { ThreadMessage } from "@assistant-ui/core";
import {
  useCloudThreadListAdapter,
  useExternalStoreRuntime,
  useExternalMessageConverter,
  useRemoteThreadListRuntime,
} from "@assistant-ui/core/react";
import { useAuiState } from "@assistant-ui/store";
import { STREAM_CONTROLLER, useChannel, useStream } from "@langchain/react";
import type { Channel } from "@langchain/react";
import type {
  LangChainBaseMessage,
  LangChainToolCall,
  UIMessage,
  UseStreamRuntimeOptions,
} from "./types";
import {
  convertLangChainBaseMessage,
  getMessageContent,
  getMessageType,
} from "./convertMessages";
import { foldUIUpdates, mergeUIMessages } from "./uiMessages";
import { langChainExtras } from "./runtimeExtras";
import { resolveForkCheckpoint } from "./resolveForkCheckpoint";
import { useLangChainStreamingTiming } from "./streamingTiming";

const UI_CUSTOM_CHANNELS: readonly Channel[] = ["custom"];

export const runConfigToSubmitOptions = (
  runConfig: AppendMessage["runConfig"],
) =>
  runConfig?.custom
    ? { config: { configurable: runConfig.custom } }
    : undefined;

/**
 * Group the graph's accumulated `UIMessage`s by the assistant message they
 * belong to. Non-array state and entries without a parent link are dropped.
 * The parent id comes from `metadata.message_id` (Python SDK) or
 * `metadata.id` (JS SDK).
 */
export const groupUIMessagesByParent = (
  value: unknown,
): Map<string, UIMessage[]> => {
  const map = new Map<string, UIMessage[]>();
  if (!Array.isArray(value)) return map;
  for (const ui of value as UIMessage[]) {
    const parentId = ui.metadata?.message_id ?? ui.metadata?.id;
    if (!parentId) continue;
    const existing = map.get(parentId);
    if (existing) {
      existing.push(ui);
    } else {
      map.set(parentId, [ui]);
    }
  }
  return map;
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

const toStagedHumanMessage = (
  msg: AppendMessage,
  id = generateId(),
): LangChainBaseMessage & { id: string } => ({
  id,
  _getType: () => "human",
  content: getMessageContent(msg),
});

const truncateLangChainBaseMessages = (
  threadMessages: readonly ThreadMessage[],
  parentId: string | null,
): LangChainBaseMessage[] => {
  if (parentId === null) return [];
  const parentIndex = threadMessages.findIndex((m) => m.id === parentId);
  if (parentIndex === -1) return [];
  const truncated: LangChainBaseMessage[] = [];
  for (let i = 0; i <= parentIndex && i < threadMessages.length; i++) {
    truncated.push(
      ...getExternalStoreMessages<LangChainBaseMessage>(threadMessages[i]!),
    );
  }
  return truncated;
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
  const uiStateKey = options.uiStateKey ?? "ui";

  const externalId = useAuiState((s) => s.threadListItem.externalId) as
    | string
    | null;
  // Mutate in place rather than `{ ...options, threadId }`: spreading
  // `UseStreamOptions` (a discriminated union on `transport`) into an object
  // literal merges both arms' transport types, breaking arm assignment.
  options.threadId = externalId;

  const stream = useStream(options);
  const [stagedMessages, setStagedMessages] = useState<
    LangChainBaseMessage[] | null
  >(null);

  const [toolStatuses, setToolStatuses] = useState<
    Record<string, ToolExecutionStatus>
  >({});
  const hasExecutingTools = Object.values(toolStatuses).some(
    (s) => s?.type === "executing",
  );
  const effectiveIsRunning = stream.isLoading || hasExecutingTools;

  const uiStateValue = stream.values[uiStateKey];

  const customEvents = useChannel(stream, UI_CUSTOM_CHANNELS);
  const liveUiMessages = useMemo(
    () => foldUIUpdates(customEvents),
    [customEvents],
  );

  const mergedUiMessages = useMemo(
    () => mergeUIMessages(liveUiMessages, uiStateValue),
    [liveUiMessages, uiStateValue],
  );

  const visibleMessages =
    stagedMessages ?? (stream.messages as LangChainBaseMessage[]);

  const messageTiming = useLangChainStreamingTiming(
    visibleMessages,
    effectiveIsRunning,
  );

  const convertWithUI = useMemo<
    useExternalMessageConverter.Callback<LangChainBaseMessage>
  >(() => {
    const uiMessagesByParent = groupUIMessagesByParent(mergedUiMessages);
    return (message, metadata) =>
      convertLangChainBaseMessage(message, {
        ...metadata,
        uiMessagesByParent,
        messageTiming,
      });
  }, [mergedUiMessages, messageTiming]);

  const threadMessages = useExternalMessageConverter({
    callback: convertWithUI,
    messages: visibleMessages,
    isRunning: effectiveIsRunning,
  });

  const streamRef = useRef(stream);
  streamRef.current = stream;

  const visibleMessagesRef = useRef(visibleMessages);
  visibleMessagesRef.current = visibleMessages;

  const threadMessagesRef = useRef(threadMessages);
  threadMessagesRef.current = threadMessages;

  const stagedMessagesRef = useRef(
    new Map<
      string,
      {
        message: LangChainBaseMessage & { id: string };
        runConfig: AppendMessage["runConfig"];
      }
    >(),
  );

  const getStagedRun = (parentId: string | null) => {
    if (!parentId || !stagedMessagesRef.current.has(parentId)) return null;

    const staged: LangChainBaseMessage[] = [];
    for (const message of visibleMessagesRef.current) {
      if (message.id && stagedMessagesRef.current.has(message.id)) {
        staged.push(stagedMessagesRef.current.get(message.id)!.message);
      }
      if (message.id === parentId) break;
    }

    return {
      messages: staged,
      runConfig: stagedMessagesRef.current.get(parentId)!.runConfig,
    };
  };

  const stageUserMessage = (msg: AppendMessage) => {
    const stagedMessage = toStagedHumanMessage(msg);
    stagedMessagesRef.current.set(stagedMessage.id, {
      message: stagedMessage,
      runConfig: msg.runConfig,
    });
    const nextMessages = [...visibleMessagesRef.current, stagedMessage];
    visibleMessagesRef.current = nextMessages;
    setStagedMessages(nextMessages);
  };

  const extras = useMemo(
    () =>
      langChainExtras.provide({
        interrupt: stream.interrupt,
        interrupts: stream.interrupts,
        toolCalls: stream.toolCalls,
        subagents: stream.subagents,
        subgraphs: stream.subgraphs,
        stream,
        error: stream.error,
        submit: stream.submit,
        respond: stream.respond,
        respondAll: stream.respondAll,
        values: stream.values,
        messagesKey,
      }),
    [stream, messagesKey],
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
      if (!(msg.startRun ?? msg.role === "user")) {
        stageUserMessage(msg);
        return;
      }

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
    onReload: async (parentId, config) => {
      const stagedRun = getStagedRun(parentId);
      if (stagedRun) {
        for (const message of stagedRun.messages) {
          if (message.id) stagedMessagesRef.current.delete(message.id);
        }
        setStagedMessages(null);
        await stream.submit(
          {
            [messagesKey]: stagedRun.messages.map((message) => ({
              id: message.id,
              type: "human",
              content: message.content,
            })),
          },
          runConfigToSubmitOptions(config.runConfig ?? stagedRun.runConfig),
        );
        return;
      }

      const threadId = externalId;
      if (!threadId || parentId == null) return;
      const s = streamRef.current;
      const checkpointId = await resolveForkCheckpoint(
        s.client,
        threadId,
        s.messages as readonly LangChainBaseMessage[],
        parentId,
        config.sourceId,
        s[STREAM_CONTROLLER]?.messageMetadataStore?.getSnapshot?.(),
        messagesKey,
      );
      if (!checkpointId) return;
      await s.submit(null, {
        forkFrom: checkpointId,
        ...runConfigToSubmitOptions(config.runConfig),
      });
    },
    onEdit: async (message) => {
      if (!(message.startRun ?? message.role === "user")) {
        const truncated = truncateLangChainBaseMessages(
          threadMessagesRef.current,
          message.parentId,
        );
        const stagedMessage = toStagedHumanMessage(message);
        stagedMessagesRef.current.set(stagedMessage.id, {
          message: stagedMessage,
          runConfig: message.runConfig,
        });
        const nextMessages = [...truncated, stagedMessage];
        visibleMessagesRef.current = nextMessages;
        setStagedMessages(nextMessages);
        return;
      }

      const threadId = externalId;
      if (!threadId) return;
      const s = streamRef.current;
      const checkpointId = await resolveForkCheckpoint(
        s.client,
        threadId,
        s.messages as readonly LangChainBaseMessage[],
        message.parentId,
        message.sourceId,
        s[STREAM_CONTROLLER]?.messageMetadataStore?.getSnapshot?.(),
        messagesKey,
      );
      if (!checkpointId) return;
      const content = getMessageContent(message);
      await s.submit(
        { [messagesKey]: [{ type: "human", content }] },
        {
          forkFrom: checkpointId,
          ...runConfigToSubmitOptions(message.runConfig),
        },
      );
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
    onThreadIdChange,
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
    onThreadIdChange,
  });
};
