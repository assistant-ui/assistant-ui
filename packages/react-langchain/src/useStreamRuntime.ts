/// <reference types="@assistant-ui/core/store" />
"use client";

import {
  useCallback,
  useEffect,
  useInsertionEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { AppendMessage, ToolExecutionStatus } from "@assistant-ui/core";
import {
  generateId,
  getExternalStoreMessages,
  pickExternalStoreSharedOptions,
} from "@assistant-ui/core";
import type { ThreadMessage } from "@assistant-ui/core";
import {
  createCloudThreadListAdapterCreateFallback,
  createToolCallCancellationStub,
  scanPendingToolCalls,
} from "@assistant-ui/core/internal";
import {
  useCloudThreadListAdapter,
  useExternalStoreRuntime,
  useExternalMessageConverter,
  useRemoteThreadListRuntime,
} from "@assistant-ui/core/react";
import { useAui, useAuiState } from "@assistant-ui/store";
import { STREAM_CONTROLLER, useChannel, useStream } from "@langchain/react";
import type { Channel } from "@langchain/react";
import type {
  LangChainBaseMessage,
  LangChainToolCall,
  UIMessage,
  UseStreamRuntimeOptions,
} from "./types";
import { groupUIMessagesByParent } from "./converter";
export { groupUIMessagesByParent } from "./converter";
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

type NormalizedRunConfigOptions = NonNullable<
  ReturnType<typeof runConfigToSubmitOptions>
>;

const getPendingToolCalls = (
  messages: readonly LangChainBaseMessage[],
): LangChainToolCall[] =>
  scanPendingToolCalls(
    messages,
    (message) => {
      const type = getMessageType(message);
      if (type === "ai") return { toolCalls: message.tool_calls ?? [] };
      if (type === "tool" && message.tool_call_id) {
        return { toolCallId: message.tool_call_id };
      }
      return undefined;
    },
    (toolCall) => toolCall.id,
  );

const toStagedHumanMessage = (
  msg: AppendMessage,
  id = generateId(),
): LangChainBaseMessage & { id: string } => ({
  id,
  _getType: () => "human",
  content: getMessageContent(msg),
});

const humanContentText = (content: LangChainBaseMessage["content"]) => {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter(
      (part): part is { type: "text"; text: string } =>
        typeof part === "object" &&
        part !== null &&
        part.type === "text" &&
        typeof part.text === "string",
    )
    .map((part) => part.text)
    .join("");
};

const hasSameMessageContent = (
  a: LangChainBaseMessage,
  b: LangChainBaseMessage,
) => humanContentText(a.content) === humanContentText(b.content);

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
  const aui = useAui();
  const messagesKey = options.messagesKey ?? "messages";
  const uiStateKey = options.uiStateKey ?? "ui";

  const externalId = useAuiState((s) => s.threadListItem.externalId) as
    | string
    | null;
  // Object.assign preserves the discriminated transport union; object spread
  // collapses its arms and no longer satisfies UseStreamOptions.
  const stream = useStream(
    Object.assign({}, options, { threadId: externalId }),
  );
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
    const uiMessagesByParent =
      groupUIMessagesByParent<UIMessage>(mergedUiMessages);
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
  useInsertionEffect(() => {
    streamRef.current = stream;
  }, [stream]);

  const activeRunConfigRef = useRef<
    NormalizedRunConfigOptions["config"] | undefined
  >(undefined);
  const runConfigByMessageIdRef = useRef(
    new Map<string, NormalizedRunConfigOptions["config"] | undefined>(),
  );
  const activeThreadIdRef = useRef(externalId);
  const setActiveRunConfig = useCallback(
    (runConfig: AppendMessage["runConfig"]) => {
      activeRunConfigRef.current = runConfigToSubmitOptions(runConfig)?.config;
    },
    [],
  );
  const withActiveRunConfig = useCallback(
    (submitOptions?: Record<string, unknown>) => {
      if (submitOptions && "config" in submitOptions) return submitOptions;
      if (activeRunConfigRef.current === undefined) return submitOptions;
      return { ...submitOptions, config: activeRunConfigRef.current };
    },
    [],
  );

  useEffect(() => {
    if (
      activeThreadIdRef.current !== null &&
      activeThreadIdRef.current !== externalId
    ) {
      activeRunConfigRef.current = undefined;
      runConfigByMessageIdRef.current.clear();
    }
    activeThreadIdRef.current = externalId;
  }, [externalId]);

  useEffect(() => {
    const messages = stream.messages as readonly LangChainBaseMessage[];
    const owned = runConfigByMessageIdRef.current;
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages.at(i);
      if (
        !message?.id ||
        getMessageType(message) !== "ai" ||
        !message.tool_calls?.length
      ) {
        continue;
      }
      if (owned.has(message.id)) return;
      break;
    }
    for (const message of messages) {
      if (
        !message.id ||
        getMessageType(message) !== "ai" ||
        !message.tool_calls?.length ||
        owned.has(message.id)
      ) {
        continue;
      }
      owned.set(message.id, activeRunConfigRef.current);
    }
  }, [stream.messages]);

  const visibleMessagesRef = useRef(visibleMessages);
  useInsertionEffect(() => {
    visibleMessagesRef.current = visibleMessages;
  }, [visibleMessages]);

  const threadMessagesRef = useRef(threadMessages);
  useInsertionEffect(() => {
    threadMessagesRef.current = threadMessages;
  }, [threadMessages]);

  const stagedMessagesRef = useRef(
    new Map<
      string,
      {
        message: LangChainBaseMessage & { id: string };
        runConfig: AppendMessage["runConfig"];
        reconcileOnEcho: boolean;
        baseMessageCount: number;
      }
    >(),
  );
  const stagedBaseMessagesRef = useRef<LangChainBaseMessage[] | null>(null);
  useEffect(() => {
    if (stagedMessagesRef.current.size === 0) return;

    // Staged edits must keep their truncated base while stream updates arrive before promotion.
    const baseMessages =
      stagedBaseMessagesRef.current ??
      (stream.messages as LangChainBaseMessage[]);
    const remainingStagedMessages: LangChainBaseMessage[] = [];
    const matchedBaseMessageIndexes = new Set<number>();
    const visibleStagedIds = new Set(
      visibleMessagesRef.current.flatMap((m) => (m.id ? [m.id] : [])),
    );
    for (const [id, staged] of stagedMessagesRef.current) {
      if (!visibleStagedIds.has(id)) continue;
      const echoed = baseMessages.some((message, index) => {
        if (matchedBaseMessageIndexes.has(index)) return false;
        if (message.id === id) {
          matchedBaseMessageIndexes.add(index);
          return true;
        }
        if (
          !staged.reconcileOnEcho ||
          index < staged.baseMessageCount ||
          getMessageType(message) !== "human" ||
          !hasSameMessageContent(message, staged.message)
        ) {
          return false;
        }
        matchedBaseMessageIndexes.add(index);
        return true;
      });
      if (echoed) stagedMessagesRef.current.delete(id);
      else remainingStagedMessages.push(staged.message);
    }

    if (remainingStagedMessages.length === 0) {
      stagedBaseMessagesRef.current = null;
      visibleMessagesRef.current = baseMessages;
      // Reconciling against the upstream stream mutates the staged refs above,
      // which cannot happen during render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStagedMessages(null);
      return;
    }

    const nextMessages = [...baseMessages, ...remainingStagedMessages];
    visibleMessagesRef.current = nextMessages;
    setStagedMessages(nextMessages);
  }, [stream.messages]);

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

  const stageUserMessage = (msg: AppendMessage, reconcileOnEcho = false) => {
    const stagedMessage = toStagedHumanMessage(msg);
    stagedMessagesRef.current.set(stagedMessage.id, {
      message: stagedMessage,
      runConfig: msg.runConfig,
      reconcileOnEcho,
      baseMessageCount: streamRef.current.messages.length,
    });
    const nextMessages = [...visibleMessagesRef.current, stagedMessage];
    visibleMessagesRef.current = nextMessages;
    setStagedMessages(nextMessages);
    return stagedMessage;
  };

  const removeStagedMessage = (id: string) => {
    if (!stagedMessagesRef.current.delete(id)) return;
    const nextMessages = visibleMessagesRef.current.filter(
      (message) => message.id !== id,
    );
    visibleMessagesRef.current = nextMessages;
    if (stagedMessagesRef.current.size === 0) {
      stagedBaseMessagesRef.current = null;
      setStagedMessages(null);
    } else {
      setStagedMessages(nextMessages);
    }
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
        submit: (values, submitOptions) => {
          const isResume = values == null || submitOptions?.command != null;
          return stream.submit(
            values,
            isResume ? withActiveRunConfig(submitOptions) : submitOptions,
          );
        },
        respond: (response, respondOptions) =>
          stream.respond(response, withActiveRunConfig(respondOptions)),
        respondAll: (responsesById, respondOptions) =>
          stream.respondAll(responsesById, withActiveRunConfig(respondOptions)),
        values: stream.values,
        messagesKey,
      }),
    [stream, messagesKey, withActiveRunConfig],
  );

  const runtime = useExternalStoreRuntime({
    ...pickExternalStoreSharedOptions(options),
    isRunning: stream.isLoading,
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

      const stagedMessage = stageUserMessage(msg, true);
      const stagedMessageId = stagedMessage.id;
      setActiveRunConfig(msg.runConfig);
      const content = getMessageContent(msg);
      const cancellations =
        autoCancelPendingToolCalls !== false
          ? getPendingToolCalls(
              streamRef.current.messages as readonly LangChainBaseMessage[],
            ).map(createToolCallCancellationStub)
          : [];
      // A null threadId is not a no-op for the SDK: it rebinds the controller
      // away from its self-created thread and forces a fresh one, so the
      // submit waits for initialization to produce an identity; core no
      // longer holds appends on that barrier.
      try {
        const { externalId } = await aui.threadListItem.initialize();
        await streamRef.current.submit(
          {
            [messagesKey]: [
              ...cancellations,
              {
                id: stagedMessageId,
                type: "human",
                content,
              },
            ],
          },
          {
            ...runConfigToSubmitOptions(msg.runConfig),
            ...(externalId != null ? { threadId: externalId } : {}),
          },
        );
      } catch (error) {
        removeStagedMessage(stagedMessageId);
        throw error;
      }
    },
    onAddToolResult: async ({
      messageId,
      toolCallId,
      toolName,
      result,
      isError,
      artifact,
    }) => {
      const runConfig = runConfigByMessageIdRef.current.has(messageId)
        ? runConfigByMessageIdRef.current.get(messageId)
        : activeRunConfigRef.current;
      await stream.submit(
        {
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
        },
        runConfig === undefined ? undefined : { config: runConfig },
      );
    },
    onReload: async (parentId, config) => {
      const stagedRun = getStagedRun(parentId);
      if (stagedRun) {
        const promotedIds = new Set<string>();
        for (const message of stagedRun.messages) {
          if (!message.id) continue;
          promotedIds.add(message.id);
          stagedMessagesRef.current.delete(message.id);
        }
        stagedBaseMessagesRef.current = null;
        if (stagedMessagesRef.current.size > 0) {
          const nextMessages = visibleMessagesRef.current.filter(
            (message) => !message.id || !promotedIds.has(message.id),
          );
          visibleMessagesRef.current = nextMessages;
          setStagedMessages(nextMessages);
        } else {
          setStagedMessages(null);
        }
        const runConfig = config.runConfig ?? stagedRun.runConfig;
        setActiveRunConfig(runConfig);
        await stream.submit(
          {
            [messagesKey]: stagedRun.messages.map((message) => ({
              id: message.id,
              type: "human",
              content: message.content,
            })),
          },
          runConfigToSubmitOptions(runConfig),
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
      setActiveRunConfig(config.runConfig);
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
          reconcileOnEcho: false,
          baseMessageCount: 0,
        });
        stagedBaseMessagesRef.current = truncated;
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
      setActiveRunConfig(message.runConfig);
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
            activeRunConfigRef.current = undefined;
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

  const aui = useAui();
  const cloudAdapter = useCloudThreadListAdapter({
    cloud,
    create: createCloudThreadListAdapterCreateFallback(
      create,
      aui.threadListItem,
    ),
    delete: deleteFn,
  });
  const adapter = unstable_threadListAdapter ?? cloudAdapter;

  return useRemoteThreadListRuntime({
    runtimeHook: function RuntimeHook() {
      return useStreamThreadRuntime(options);
    },
    adapter,
    allowNesting: true,
    onThreadIdChange,
  });
};
