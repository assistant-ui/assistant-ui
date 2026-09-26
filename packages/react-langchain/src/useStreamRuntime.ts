/// <reference types="@assistant-ui/core/store" preserve="true" />
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
  getThreadMessageText,
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
import type {
  LangChainBaseMessage,
  LangChainToolCall,
  UIMessage,
  UseStreamRuntimeOptions,
} from "./types";
import { getMessageModality, groupUIMessagesByParent } from "./converter";
export { groupUIMessagesByParent } from "./converter";
import {
  convertLangChainBaseMessage,
  getMessageContent,
  getMessageType,
} from "./convertMessages";
import {
  attachSubagentTranscripts,
  createAttachMemo,
} from "./attachSubagentTranscripts";
import { useSubagentTranscripts } from "./useSubagentTranscripts";
import {
  createUIFoldMemo,
  createUISnapshotMemo,
  foldUIUpdates,
  mergeUIMessages,
  reconcileUISnapshot,
  UI_CUSTOM_CHANNELS,
} from "./uiMessages";
import { langChainExtras } from "./runtimeExtras";
import { resolveForkCheckpoint } from "./resolveForkCheckpoint";
import { useLangChainStreamingTiming } from "./streamingTiming";
import { LANGCHAIN_SDK } from "./sdkIdentity";

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

const toStagedMessageInput = (message: LangChainBaseMessage) => ({
  id: message.id,
  type: getMessageType(message) === "ai" ? ("ai" as const) : ("human" as const),
  content: message.content,
  ...(message.additional_kwargs && {
    additional_kwargs: message.additional_kwargs,
  }),
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

  const [uiSnapshotMemo] = useState(createUISnapshotMemo);
  const uiStateValue = reconcileUISnapshot(
    stream.values[uiStateKey],
    uiSnapshotMemo,
  );

  const customEvents = useChannel(stream, UI_CUSTOM_CHANNELS);
  const [uiFoldMemo] = useState(createUIFoldMemo);
  const liveUiMessages = useMemo(
    () => foldUIUpdates(customEvents, uiFoldMemo),
    [customEvents, uiFoldMemo],
  );

  const mergedUiMessages = useMemo(
    () => mergeUIMessages(liveUiMessages, uiStateValue),
    [liveUiMessages, uiStateValue],
  );

  const uiMessagesByParent = useMemo(
    () => groupUIMessagesByParent<UIMessage>(mergedUiMessages),
    [mergedUiMessages],
  );

  const visibleMessages =
    stagedMessages ?? (stream.messages as LangChainBaseMessage[]);

  const messageTiming = useLangChainStreamingTiming(
    visibleMessages,
    effectiveIsRunning,
  );

  const subagentTranscripts = useSubagentTranscripts(
    stream,
    uiMessagesByParent,
  );

  const convertWithUI = useMemo<
    useExternalMessageConverter.Callback<LangChainBaseMessage>
  >(
    () => (message, metadata) =>
      convertLangChainBaseMessage(message, {
        ...metadata,
        uiMessagesByParent,
        messageTiming,
      }),
    [uiMessagesByParent, messageTiming],
  );

  const threadMessages = useExternalMessageConverter({
    callback: convertWithUI,
    messages: visibleMessages,
    isRunning: effectiveIsRunning,
  });
  const [memo] = useState(createAttachMemo);
  const messagesWithTranscripts = useMemo(
    () => attachSubagentTranscripts(threadMessages, subagentTranscripts, memo),
    [threadMessages, subagentTranscripts, memo],
  );

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

  const threadMessagesRef = useRef(messagesWithTranscripts);
  useInsertionEffect(() => {
    threadMessagesRef.current = messagesWithTranscripts;
  }, [messagesWithTranscripts]);

  const stagedMessagesRef = useRef(
    new Map<
      string,
      {
        message: LangChainBaseMessage & { id: string };
        runConfig: AppendMessage["runConfig"];
        reconcileOnEcho: boolean;
        baseMessageCount: number;
        transcriptStatus?: "unsent" | "sent";
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
    const parent = parentId
      ? stagedMessagesRef.current.get(parentId)
      : undefined;
    if (!parent || parent.transcriptStatus === "sent") return null;

    const staged: LangChainBaseMessage[] = [];
    for (const message of visibleMessagesRef.current) {
      const entry = message.id
        ? stagedMessagesRef.current.get(message.id)
        : undefined;
      if (entry && entry.transcriptStatus !== "sent") {
        staged.push(entry.message);
      }
      if (message.id === parentId) break;
    }

    return {
      messages: staged,
      runConfig: parent.runConfig,
    };
  };

  const appendVoiceTranscript = (message: ThreadMessage) => {
    const transcript = {
      id: message.id,
      _getType: () => (message.role === "assistant" ? "ai" : "human"),
      content: getThreadMessageText(message),
      ...(message.metadata.modality && {
        additional_kwargs: { modality: message.metadata.modality },
      }),
    };
    stagedMessagesRef.current.set(transcript.id, {
      message: transcript,
      runConfig: undefined,
      reconcileOnEcho: false,
      baseMessageCount: streamRef.current.messages.length,
      transcriptStatus: "unsent",
    });
    const nextMessages = [...visibleMessagesRef.current, transcript];
    visibleMessagesRef.current = nextMessages;
    setStagedMessages(nextMessages);
  };

  const getUnsentTranscripts = () =>
    visibleMessagesRef.current.filter(
      (message) =>
        message.id !== undefined &&
        stagedMessagesRef.current.get(message.id)?.transcriptStatus ===
          "unsent",
    );

  const setTranscriptStatus = (
    messages: readonly LangChainBaseMessage[],
    status: "unsent" | "sent",
  ) => {
    for (const message of messages) {
      const staged = message.id
        ? stagedMessagesRef.current.get(message.id)
        : undefined;
      if (staged?.transcriptStatus) staged.transcriptStatus = status;
    }
  };

  // Reserving before the submit keeps an overlapping submit from carrying the
  // same transcript; a failed submit hands it back to the next run.
  const submitCarryingTranscripts = async (
    transcripts: readonly LangChainBaseMessage[],
    submit: () => Promise<void>,
  ) => {
    setTranscriptStatus(transcripts, "sent");
    try {
      await submit();
    } catch (error) {
      setTranscriptStatus(transcripts, "unsent");
      throw error;
    }
  };

  const dropTranscripts = (messages: readonly LangChainBaseMessage[]) => {
    for (const message of messages) {
      if (
        message.id &&
        stagedMessagesRef.current.get(message.id)?.transcriptStatus
      )
        removeStagedMessage(message.id);
    }
  };

  const isTranscriptMessage = (message: LangChainBaseMessage) => {
    const staged = message.id
      ? stagedMessagesRef.current.get(message.id)
      : undefined;
    if (staged?.transcriptStatus === "unsent") return true;
    const type = getMessageType(message);
    return (
      (type === "human" || type === "ai") &&
      getMessageModality(message.additional_kwargs) !== undefined
    );
  };

  // A transcript reaches the graph in the same input as the message after it, so
  // no checkpoint ends at one; a fork starts before the trailing transcripts.
  const planForkTranscripts = (parentId: string | null) => {
    const visible = visibleMessagesRef.current;
    const parentIndex =
      parentId == null ? -1 : visible.findIndex((m) => m.id === parentId);
    if (parentId != null && parentIndex === -1)
      return { forkParentId: parentId, transcripts: [], truncated: [] };

    let start = parentIndex + 1;
    while (start > 0 && isTranscriptMessage(visible[start - 1]!)) start--;
    return {
      forkParentId: start > 0 ? (visible[start - 1]!.id ?? null) : null,
      transcripts: visible.slice(start, parentIndex + 1),
      truncated: visible.slice(parentIndex + 1),
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
    messages: messagesWithTranscripts,
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
            )
              // LangChain rejects a tool message without a tool_call_id.
              .filter((toolCall) => toolCall.id)
              .map(createToolCallCancellationStub)
          : [];
      // A null threadId is not a no-op for the SDK: it rebinds the controller
      // away from its self-created thread and forces a fresh one, so the
      // submit waits for initialization to produce an identity; core no
      // longer holds appends on that barrier.
      try {
        const { externalId } = await aui.threadListItem.initialize();
        const transcripts = getUnsentTranscripts();
        await submitCarryingTranscripts(transcripts, () =>
          streamRef.current.submit(
            {
              [messagesKey]: [
                ...cancellations,
                ...transcripts.map(toStagedMessageInput),
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
          ),
        );
      } catch (error) {
        removeStagedMessage(stagedMessageId);
        throw error;
      }
    },
    onVoiceTranscript: appendVoiceTranscript,
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
        if (
          config.sourceId &&
          stagedMessagesRef.current.get(config.sourceId)?.transcriptStatus
        )
          removeStagedMessage(config.sourceId);
        const promotedIds = new Set<string>();
        for (const message of stagedRun.messages) {
          if (
            !message.id ||
            stagedMessagesRef.current.get(message.id)?.transcriptStatus
          )
            continue;
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
        await submitCarryingTranscripts(stagedRun.messages, () =>
          stream.submit(
            {
              [messagesKey]: stagedRun.messages.map(toStagedMessageInput),
            },
            runConfigToSubmitOptions(runConfig),
          ),
        );
        return;
      }

      const threadId = externalId;
      if (!threadId || parentId == null) return;
      const s = streamRef.current;
      const fork = planForkTranscripts(parentId);
      const checkpointId = await resolveForkCheckpoint(
        s.client,
        threadId,
        s.messages as readonly LangChainBaseMessage[],
        fork.forkParentId,
        config.sourceId,
        s[STREAM_CONTROLLER]?.messageMetadataStore?.getSnapshot?.(),
        messagesKey,
      );
      if (!checkpointId) return;
      dropTranscripts(fork.truncated);
      setActiveRunConfig(config.runConfig);
      await submitCarryingTranscripts(fork.transcripts, () =>
        s.submit(
          fork.transcripts.length > 0
            ? { [messagesKey]: fork.transcripts.map(toStagedMessageInput) }
            : null,
          {
            forkFrom: checkpointId,
            ...runConfigToSubmitOptions(config.runConfig),
          },
        ),
      );
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
      const fork = planForkTranscripts(message.parentId);
      const checkpointId = await resolveForkCheckpoint(
        s.client,
        threadId,
        s.messages as readonly LangChainBaseMessage[],
        fork.forkParentId,
        message.sourceId,
        s[STREAM_CONTROLLER]?.messageMetadataStore?.getSnapshot?.(),
        messagesKey,
      );
      if (!checkpointId) return;
      dropTranscripts(fork.truncated);
      const content = getMessageContent(message);
      setActiveRunConfig(message.runConfig);
      await submitCarryingTranscripts(fork.transcripts, () =>
        s.submit(
          {
            [messagesKey]: [
              ...fork.transcripts.map(toStagedMessageInput),
              { type: "human", content },
            ],
          },
          {
            forkFrom: checkpointId,
            ...runConfigToSubmitOptions(message.runConfig),
          },
        ),
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
    sdk: LANGCHAIN_SDK,
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
