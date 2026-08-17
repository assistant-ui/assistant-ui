import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type {
  LangChainMessage,
  UIMessage,
  UseLangGraphRuntimeOptions,
} from "./types";
import {
  pickExternalStoreSharedOptions,
  createMessageQueue,
  type MessageQueueController,
  type AppendMessage,
  type CompleteAttachment,
  generateId,
} from "@assistant-ui/core";
import type { ToolExecutionStatus } from "@assistant-ui/core";
import type { QueueItemState } from "@assistant-ui/core/store";
import {
  type DataMessagePartComponent,
  useCloudThreadListAdapter,
  useRemoteThreadListRuntime,
  useExternalMessageConverter,
  useExternalStoreRuntime,
} from "@assistant-ui/core/react";
import { useAui } from "@assistant-ui/store";
import {
  convertLangChainMessages,
  getMessageContent,
} from "./convertLangChainMessages";
import {
  type LangGraphSendMessageConfig,
  useLangGraphMessages,
} from "./useLangGraphMessages";
import { appendLangChainChunk } from "./appendLangChainChunk";
import { useLangGraphStreamingTiming } from "./useLangGraphStreamingTiming";
import { bufferToolResult } from "./bufferToolResults";
import {
  createSerialRunQueue,
  SerialRunQueueDropError,
  type SerialRunQueue,
} from "./serialRunQueue";
import { langGraphExtras } from "./runtimeExtras";
import {
  filterUIMessagesBySurvivingIds,
  getPendingToolCallGroups,
  getPendingToolCalls,
  hasToolResult,
  truncateLangChainMessages,
} from "./messageHelpers";

const EMPTY_QUEUE_ITEMS: readonly QueueItemState[] = Object.freeze([]);
const subscribeNoop = () => () => {};

const toLangGraphUserMessage = (
  msg: AppendMessage,
  id = generateId(),
): LangChainMessage & { type: "human"; id: string } => ({
  id,
  type: "human",
  content: getMessageContent(msg),
});

const useLangGraphRuntimeImpl = (options: UseLangGraphRuntimeOptions) => {
  const {
    autoCancelPendingToolCalls,
    adapters: { attachments, dictation, feedback, speech, voice } = {},
    unstable_allowCancellation,
    unstable_enableMessageQueue,
    stream,
    load,
    getCheckpointId,
    eventHandlers,
    uiStateKey,
    uiComponents,
  } = options;
  const aui = useAui();
  const pendingStateRef = useRef<Record<string, unknown> | undefined>(
    undefined,
  );
  const effectiveStateRef = useRef<Record<string, unknown> | undefined>(
    undefined,
  );
  const [optimisticState, setOptimisticState] = useState<
    Record<string, unknown> | undefined
  >();

  // Attachments the composer handed to onNew/onEdit, keyed by the staged human
  // message id. The wire message only carries flattened `content` (so the model
  // input is unchanged), while the converter reattaches them here so
  // MessagePrimitive.Attachments can render them as standalone cards.
  const attachmentsByMessageIdRef = useRef(
    new Map<string, readonly CompleteAttachment[]>(),
  );
  const stageAttachments = (
    id: string,
    attachments: readonly CompleteAttachment[] | undefined,
  ) => {
    if (attachments?.length)
      attachmentsByMessageIdRef.current.set(id, attachments);
  };

  // Ref-based reconcile so inline `uiComponents` objects don't re-register
  // every render via `useEffect` dependency identity.
  const uiFallback = uiComponents?.fallback;
  const uiRenderers = uiComponents?.renderers;
  const registeredRenderersRef = useRef<Map<string, DataMessagePartComponent>>(
    new Map(),
  );
  const rendererCleanupsRef = useRef<Map<string, () => void>>(new Map());
  const fallbackRef = useRef<DataMessagePartComponent | undefined>(undefined);
  const fallbackCleanupRef = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    const registered = registeredRenderersRef.current;
    const cleanups = rendererCleanupsRef.current;

    for (const [name, prev] of registered) {
      if (uiRenderers?.[name] !== prev) {
        cleanups.get(name)?.();
        cleanups.delete(name);
        registered.delete(name);
      }
    }
    if (uiRenderers) {
      for (const [name, component] of Object.entries(uiRenderers)) {
        if (component && registered.get(name) !== component) {
          cleanups.set(name, aui.dataRenderers.setDataUI(name, component));
          registered.set(name, component);
        }
      }
    }

    if (uiFallback !== fallbackRef.current) {
      fallbackCleanupRef.current?.();
      fallbackCleanupRef.current = uiFallback
        ? aui.dataRenderers.setFallbackDataUI(uiFallback)
        : undefined;
      fallbackRef.current = uiFallback;
    }
  });

  useEffect(() => {
    const cleanups = rendererCleanupsRef.current;
    const registered = registeredRenderersRef.current;
    return () => {
      for (const cleanup of cleanups.values()) cleanup();
      cleanups.clear();
      registered.clear();
      fallbackCleanupRef.current?.();
      fallbackCleanupRef.current = undefined;
      fallbackRef.current = undefined;
    };
  }, []);
  // Top-level and subgraph error events both dispatch onError; subgraph errors
  // additionally dispatch onSubgraphError (see OnErrorEventCallback docs). The
  // balance is positive iff the run saw a top-level error, which drops any
  // sends queued behind it.
  const runErrorBalanceRef = useRef(0);
  const wrappedEventHandlers = useMemo(
    () =>
      ({
        ...eventHandlers,
        onError: (error: unknown) => {
          runErrorBalanceRef.current++;
          return eventHandlers?.onError?.(error);
        },
        onSubgraphError: (namespace: string, error: unknown) => {
          runErrorBalanceRef.current--;
          return eventHandlers?.onSubgraphError?.(namespace, error);
        },
        onValues: (values: unknown) => {
          setOptimisticState(undefined);
          return eventHandlers?.onValues?.(values);
        },
      }) satisfies UseLangGraphRuntimeOptions["eventHandlers"],
    [eventHandlers],
  );

  const runConfigByToolCallIdRef = useRef(new Map<string, unknown>());
  const groupKeyByToolCallIdRef = useRef(new Map<string, string>());
  const activeRunConfigRef = useRef<{ value: unknown } | null>(null);
  const rememberStreamedRunConfig = useCallback(function remember(
    value: unknown,
    runConfig: unknown,
  ) {
    if (Array.isArray(value)) {
      for (const item of value) remember(item, runConfig);
      return;
    }
    if (value == null || typeof value !== "object") return;
    const message = value as {
      id?: unknown;
      type?: unknown;
      tool_calls?: unknown;
      messages?: unknown;
    };
    if (message.type === "ai" && Array.isArray(message.tool_calls)) {
      const firstToolCallId = (
        message.tool_calls[0] as { id?: unknown } | undefined
      )?.id;
      const groupKey =
        typeof message.id === "string"
          ? `message:${message.id}`
          : typeof firstToolCallId === "string"
            ? `tool:${firstToolCallId}`
            : undefined;
      for (const toolCall of message.tool_calls) {
        if (
          groupKey !== undefined &&
          toolCall &&
          typeof toolCall === "object" &&
          typeof (toolCall as { id?: unknown }).id === "string"
        ) {
          groupKeyByToolCallIdRef.current.set(
            (toolCall as { id: string }).id,
            groupKey,
          );
          runConfigByToolCallIdRef.current.set(
            (toolCall as { id: string }).id,
            runConfig,
          );
        }
      }
    }
    if (Array.isArray(message.messages)) remember(message.messages, runConfig);
    else {
      for (const child of Object.values(value)) remember(child, runConfig);
    }
  }, []);
  const streamWithRunConfig = useCallback(
    async (...args: Parameters<UseLangGraphRuntimeOptions["stream"]>) => {
      const response = await stream(...args);
      return (async function* () {
        for await (const event of response) {
          rememberStreamedRunConfig(event.data, args[1].runConfig);
          yield event;
        }
      })();
    },
    [stream, rememberStreamedRunConfig],
  );

  const {
    interrupt,
    values,
    setInterrupt,
    messages,
    messageMetadata,
    uiMessages,
    sendMessage,
    cancel,
    setMessages,
    setValues,
    setUIMessages,
    reconcileMessages,
    reconcileUIMessages,
    reconcileInterrupt,
  } = useLangGraphMessages({
    appendMessage: appendLangChainChunk,
    stream: streamWithRunConfig,
    eventHandlers: wrappedEventHandlers,
    ...(uiStateKey !== undefined && { uiStateKey }),
  });

  const [isRunning, setIsRunning] = useState(false);
  const [isLoadingThread, setIsLoadingThread] = useState(
    () =>
      load !== undefined &&
      aui.threadListItem.source !== null &&
      aui.threadListItem.getState().externalId != null,
  );
  const [toolStatuses, setToolStatuses] = useState<
    Record<string, ToolExecutionStatus>
  >({});
  const toolArgsKeyOrderCacheRef = useRef<Map<string, Map<string, string[]>>>(
    new Map(),
  );
  const toolResultBuffersRef = useRef<
    Map<string, Map<string, LangChainMessage & { type: "tool" }>>
  >(new Map());
  const pendingResumeRef = useRef<
    Map<
      string,
      {
        messages: (LangChainMessage & { type: "tool" })[];
      }
    >
  >(new Map());
  const langGraphMessagesRef = useRef(messages);
  langGraphMessagesRef.current = messages;

  const getToolRunConfig = (toolCallId: string) => {
    if (runConfigByToolCallIdRef.current.has(toolCallId)) {
      return {
        hasValue: true,
        value: runConfigByToolCallIdRef.current.get(toolCallId),
      };
    }
    if (activeRunConfigRef.current) {
      return { hasValue: true, value: activeRunConfigRef.current.value };
    }
    return { hasValue: false, value: undefined };
  };

  const queueRef = useRef<MessageQueueController | null>(null);
  // The purpose rides along because only a refetch may be superseded by a
  // send: aborting an initial load would strand its history and loading flag.
  const loadControllerRef = useRef<{
    controller: AbortController;
    purpose: "initial" | "reload";
    promise?: Promise<void>;
  } | null>(null);
  const hasExecutingTools = Object.values(toolStatuses).some(
    (s) => s?.type === "executing",
  );
  const effectiveIsRunning = isRunning || hasExecutingTools;

  const messageTiming = useLangGraphStreamingTiming(
    messages,
    effectiveIsRunning,
  );

  const uiMessagesByParent = useMemo(() => {
    const map = new Map<string, UIMessage[]>();
    for (const ui of uiMessages) {
      const parentId = ui.metadata?.message_id;
      if (!parentId) continue;
      const existing = map.get(parentId);
      if (existing) {
        existing.push(ui);
      } else {
        map.set(parentId, [ui]);
      }
    }
    return map;
  }, [uiMessages]);

  // fresh metadata identity invalidates the converter cache; each UI event re-converts all messages
  const converterMetadata = useMemo(
    () =>
      ({
        toolArgsKeyOrderCache: toolArgsKeyOrderCacheRef.current,
        uiMessagesByParent,
        messageTiming,
        attachmentsByMessageId: attachmentsByMessageIdRef.current,
      }) as unknown as useExternalMessageConverter.Metadata,
    [uiMessagesByParent, messageTiming],
  );

  const sendMessageRef = useRef(sendMessage);
  sendMessageRef.current = sendMessage;

  // Runs on a thread never overlap: a send arriving while a run is still
  // draining (e.g. a frontend tool result resuming the graph) waits for it to
  // settle. isRunning flips atomically with the final reconcile via onComplete.
  const runQueueRef = useRef<SerialRunQueue<{
    messages: LangChainMessage[];
    config: LangGraphSendMessageConfig;
    groupKey?: string;
  }> | null>(null);
  runQueueRef.current ??= createSerialRunQueue({
    run: ({ messages, config, groupKey }, onComplete) => {
      if (
        groupKey !== undefined &&
        pendingResumeRef.current.get(groupKey)?.messages === messages
      ) {
        pendingResumeRef.current.delete(groupKey);
      }
      activeRunConfigRef.current = { value: config.runConfig };
      runErrorBalanceRef.current = 0;
      return sendMessageRef.current(messages, config, () => {
        activeRunConfigRef.current = null;
        if (runErrorBalanceRef.current > 0) {
          pendingResumeRef.current.clear();
          runQueueRef.current!.drop();
        }
        onComplete();
      });
    },
    onRunningChange: setIsRunning,
  });
  const runQueue = runQueueRef.current;

  const cancelActiveRun = useCallback(() => {
    pendingResumeRef.current.clear();
    toolResultBuffersRef.current.clear();
    runConfigByToolCallIdRef.current.clear();
    groupKeyByToolCallIdRef.current.clear();
    runQueue.drop();
    queueRef.current?.clear();
    cancel();
  }, [runQueue, cancel]);

  const handleSendMessage = (
    messages: LangChainMessage[],
    config: LangGraphSendMessageConfig,
    groupKey?: string,
  ) => {
    // Only a refetch: its landing snapshot would erase the message just sent.
    if (loadControllerRef.current?.purpose === "reload") {
      loadControllerRef.current.controller.abort();
    }
    const state = pendingStateRef.current;
    pendingStateRef.current = undefined;
    return runQueue.enqueue({
      messages,
      config: state ? { ...config, state } : config,
      ...(groupKey !== undefined && { groupKey }),
    });
  };

  const state = useMemo(
    () =>
      optimisticState ? { ...(values ?? {}), ...optimisticState } : values,
    [optimisticState, values],
  );
  effectiveStateRef.current = state;

  const setState = (
    next:
      | Record<string, unknown>
      | ((
          prev: Record<string, unknown> | undefined,
        ) => Record<string, unknown>),
  ) => {
    const resolved =
      typeof next === "function" ? next(effectiveStateRef.current) : next;
    effectiveStateRef.current = resolved;
    pendingStateRef.current = resolved;
    setOptimisticState(resolved);
  };

  const runUserMessage = async (msg: AppendMessage) => {
    // A new turn abandons any half-collected parallel tool batch and any
    // queued resume; the cancellations below answer the dangling tool calls.
    toolResultBuffersRef.current.clear();
    pendingResumeRef.current.clear();
    runQueue.drop();
    const cancellations =
      autoCancelPendingToolCalls !== false
        ? getPendingToolCalls(messages).map(
            (t) =>
              ({
                type: "tool",
                name: t.name,
                tool_call_id: t.id,
                content: JSON.stringify({ cancelled: true }),
                status: "error",
              }) satisfies LangChainMessage & { type: "tool" },
          )
        : [];

    const humanMessage = toLangGraphUserMessage(msg);
    stageAttachments(humanMessage.id, msg.attachments);
    return handleSendMessage([...cancellations, humanMessage], {
      runConfig: msg.runConfig,
    });
  };

  const interruptRef = useRef(interrupt);
  interruptRef.current = interrupt;

  const stagedMessagesRef = useRef(
    new Map<
      string,
      {
        message: LangChainMessage & { id: string };
        runConfig: AppendMessage["runConfig"];
      }
    >(),
  );
  const [stagedMessageCount, setStagedMessageCount] = useState(0);
  const hasStagedMessages = stagedMessageCount > 0;

  const getStagedRun = (parentId: string | null) => {
    if (!parentId || !stagedMessagesRef.current.has(parentId)) return null;

    const staged: LangChainMessage[] = [];
    for (const message of langGraphMessagesRef.current) {
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
    const stagedMessage = toLangGraphUserMessage(msg);
    stageAttachments(stagedMessage.id, msg.attachments);
    stagedMessagesRef.current.set(stagedMessage.id, {
      message: stagedMessage,
      runConfig: msg.runConfig,
    });
    setStagedMessageCount(stagedMessagesRef.current.size);
    const nextMessages = [...langGraphMessagesRef.current, stagedMessage];
    langGraphMessagesRef.current = nextMessages;
    setMessages(nextMessages);
  };

  // The controller is created once; route through a ref so its driver runs the
  // latest runUserMessage (which closes over the current `messages`).
  const runUserMessageRef = useRef(runUserMessage);
  runUserMessageRef.current = runUserMessage;

  if (unstable_enableMessageQueue && !queueRef.current) {
    queueRef.current = createMessageQueue({
      run: (message) => {
        void runUserMessageRef.current(message).catch(() => {});
      },
    });
  } else if (!unstable_enableMessageQueue && queueRef.current) {
    queueRef.current = null;
  }
  const queueController = unstable_enableMessageQueue ? queueRef.current : null;

  // Re-render when queued items change so the store re-syncs composer.queue.
  // The snapshot value itself is unused; the subscription is the point.
  useSyncExternalStore(
    queueController?.subscribe ?? subscribeNoop,
    () => queueController?.adapter.items ?? EMPTY_QUEUE_ITEMS,
    () => EMPTY_QUEUE_ITEMS,
  );
  useSyncExternalStore(
    queueController?.subscribe ?? subscribeNoop,
    () => queueController?.adapter.steerItems ?? EMPTY_QUEUE_ITEMS,
    () => EMPTY_QUEUE_ITEMS,
  );

  // Gate on effectiveIsRunning, not isRunning, so a queued message does not
  // start while a client tool from the just-finished run is still executing.
  const wasRunningRef = useRef(effectiveIsRunning);
  useEffect(() => {
    if (!wasRunningRef.current && effectiveIsRunning) {
      queueController?.notifyBusy();
    }
    if (wasRunningRef.current && !effectiveIsRunning) {
      queueController?.notifyIdle();
    }
    wasRunningRef.current = effectiveIsRunning;
  }, [effectiveIsRunning, queueController]);

  const threadMessages = useExternalMessageConverter({
    callback: convertLangChainMessages,
    messages,
    isRunning: effectiveIsRunning,
    metadata: converterMetadata,
  });

  const threadMessagesRef = useRef(threadMessages);
  threadMessagesRef.current = threadMessages;

  const uiMessagesRef = useRef(uiMessages);
  uiMessagesRef.current = uiMessages;

  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  const threadListItem =
    aui.threadListItem.source !== null ? aui.threadListItem : undefined;

  const runLoad = useCallback(
    (purpose: "initial" | "reload" = "initial") => {
      const load = loadRef.current;
      if (!load || !threadListItem) return Promise.resolve();

      const externalId = threadListItem.getState().externalId;
      if (externalId == null) return Promise.resolve();

      // The initial load is already fetching what a refetch would ask for,
      // and taking it over strands its history if the refetch then fails.
      if (
        purpose === "reload" &&
        loadControllerRef.current?.purpose === "initial"
      )
        // Settle with the load deferred to, so awaiting a refetch still means
        // the thread is fresh.
        return loadControllerRef.current.promise ?? Promise.resolve();

      loadControllerRef.current?.controller.abort();
      const controller = new AbortController();
      const record: NonNullable<typeof loadControllerRef.current> = {
        controller,
        purpose,
      };
      loadControllerRef.current = record;

      const messagesAtLoadStart = langGraphMessagesRef.current;
      const uiMessagesAtLoadStart = uiMessagesRef.current;
      const interruptAtLoadStart = interruptRef.current;

      if (purpose === "initial") {
        toolResultBuffersRef.current.clear();
        runConfigByToolCallIdRef.current.clear();
        groupKeyByToolCallIdRef.current.clear();
        pendingStateRef.current = undefined;
        effectiveStateRef.current = undefined;
        setOptimisticState(undefined);
        setValues(undefined);
        setIsLoadingThread(true);
      }
      // A refetch touches nothing else: the load boundary already decides
      // what a run started since keeps, so it needs no reset and no cancel.
      const task = load(externalId, { signal: controller.signal })
        .then(({ messages, interrupts, uiMessages }) => {
          if (controller.signal.aborted) return;
          // Only an initial load is the whole thread; a refetch can race
          // output the server has not stored yet.
          const opts = { snapshotIsComplete: purpose === "initial" };
          reconcileMessages(messages, messagesAtLoadStart, opts);
          reconcileUIMessages(uiMessages ?? [], uiMessagesAtLoadStart, opts);
          reconcileInterrupt(interrupts?.[0], interruptAtLoadStart);
        })
        .catch((error) => {
          if (controller.signal.aborted) return;
          throw error;
        })
        .finally(() => {
          if (loadControllerRef.current?.controller === controller) {
            loadControllerRef.current = null;
          }
          if (controller.signal.aborted) return;
          setIsLoadingThread(false);
        });
      // `task` rejects so a refetch deferring to it learns of the failure;
      // only the initial load's caller swallows it.
      record.promise = task;
      if (purpose === "reload") return task;
      return task.catch((error) => {
        console.warn("useLangGraphRuntime: load handler rejected", error);
      });
    },
    [
      threadListItem,
      setValues,
      reconcileMessages,
      reconcileUIMessages,
      reconcileInterrupt,
    ],
  );

  useEffect(() => {
    runLoad();
    return () => {
      // Whatever is current, not this effect's own controller: a refetch swaps
      // the ref, and one in flight at unmount must be aborted too.
      loadControllerRef.current?.controller.abort();
      setIsLoadingThread(false);
    };
  }, [runLoad]);

  useEffect(() => cancelActiveRun, [cancelActiveRun]);

  const runtime = useExternalStoreRuntime({
    ...pickExternalStoreSharedOptions(options),
    isRunning: effectiveIsRunning,
    isLoading: isLoadingThread,
    messages: threadMessages,
    unstable_enableToolInvocations: true,
    setToolStatuses,
    adapters: {
      attachments,
      dictation,
      feedback,
      speech,
      voice,
    },
    extras: langGraphExtras.provide({
      interrupt,
      state,
      setState,
      messageMetadata,
      uiMessages,
      send: handleSendMessage,
    }),
    onNew: async (msg) => {
      if (!(msg.startRun ?? msg.role === "user")) {
        stageUserMessage(msg);
        return;
      }
      await runUserMessage(msg);
    },
    ...(queueController && { queue: queueController.adapter }),
    onAddToolResult: async ({
      toolCallId,
      toolName,
      result,
      isError,
      artifact,
    }) => {
      // A result for a call that already has a tool message (e.g. one
      // auto-cancelled when a new turn started, or a duplicate) must not resume
      // the graph with a second tool message. A call awaiting human input has
      // no tool message yet and stays on the normal pending path.
      if (hasToolResult(messages, toolCallId)) return;
      let queuedGroupKey: string | undefined;
      let queuedResume:
        | {
            messages: (LangChainMessage & { type: "tool" })[];
          }
        | undefined;
      for (const [groupKey, resume] of pendingResumeRef.current) {
        if (resume.messages.some((m) => m.tool_call_id === toolCallId)) {
          queuedGroupKey = groupKey;
          queuedResume = resume;
          break;
        }
      }

      const pendingGroup = getPendingToolCallGroups(messages).find((group) =>
        group.toolCalls.some((toolCall) => toolCall.id === toolCallId),
      );
      const streamedGroupKey = groupKeyByToolCallIdRef.current.get(toolCallId);
      if (streamedGroupKey && !queuedResume) {
        queuedResume = pendingResumeRef.current.get(streamedGroupKey);
        if (queuedResume) queuedGroupKey = streamedGroupKey;
      }
      const groupKey =
        queuedGroupKey ??
        pendingGroup?.key ??
        streamedGroupKey ??
        `late:${toolCallId}`;
      const queuedIds = new Set(
        queuedResume?.messages.map((message) => message.tool_call_id),
      );
      const batch = bufferToolResult(
        toolResultBuffersRef.current,
        groupKey,
        (pendingGroup?.toolCalls ?? []).filter(
          (toolCall) => !queuedIds.has(toolCall.id),
        ),
        {
          type: "tool",
          name: toolName,
          tool_call_id: toolCallId,
          content: JSON.stringify(result),
          artifact,
          status: isError ? "error" : "success",
        },
      );
      if (!batch) return;
      if (queuedResume) {
        for (const message of batch) {
          const index = queuedResume.messages.findIndex(
            (m) => m.tool_call_id === message.tool_call_id,
          );
          if (index >= 0) queuedResume.messages[index] = message;
          else queuedResume.messages.push(message);
        }
        return;
      }
      const toolRunConfig = batch
        .map((message) => getToolRunConfig(message.tool_call_id))
        .find((config) => config.hasValue);
      const resumeConfig = toolRunConfig?.hasValue
        ? { runConfig: toolRunConfig.value }
        : {};
      for (const message of batch) {
        runConfigByToolCallIdRef.current.delete(message.tool_call_id);
        groupKeyByToolCallIdRef.current.delete(message.tool_call_id);
      }
      pendingResumeRef.current.set(groupKey, {
        messages: batch,
      });
      try {
        await handleSendMessage(batch, resumeConfig, groupKey);
      } catch (error) {
        if (!(error instanceof SerialRunQueueDropError)) throw error;
      } finally {
        if (pendingResumeRef.current.get(groupKey)?.messages === batch) {
          pendingResumeRef.current.delete(groupKey);
        }
      }
    },
    onEdit: getCheckpointId
      ? async (msg) => {
          toolResultBuffersRef.current.clear();
          runConfigByToolCallIdRef.current.clear();
          groupKeyByToolCallIdRef.current.clear();
          pendingResumeRef.current.clear();
          runQueue.drop();
          queueRef.current?.clear();
          const truncated = truncateLangChainMessages(
            threadMessagesRef.current,
            msg.parentId,
          );
          setMessages(truncated);
          setUIMessages(
            filterUIMessagesBySurvivingIds(uiMessagesRef.current, truncated),
          );
          setInterrupt(undefined);
          if (!(msg.startRun ?? msg.role === "user")) {
            const stagedMessage = toLangGraphUserMessage(msg);
            stageAttachments(stagedMessage.id, msg.attachments);
            stagedMessagesRef.current.set(stagedMessage.id, {
              message: stagedMessage,
              runConfig: msg.runConfig,
            });
            setStagedMessageCount(stagedMessagesRef.current.size);
            const nextMessages = [...truncated, stagedMessage];
            langGraphMessagesRef.current = nextMessages;
            setMessages(nextMessages);
            return;
          }
          const externalId = aui.threadListItem.getState().externalId;
          const checkpointId = externalId
            ? await getCheckpointId(externalId, truncated)
            : null;
          const editMessage = toLangGraphUserMessage(msg);
          stageAttachments(editMessage.id, msg.attachments);
          return handleSendMessage([editMessage], {
            runConfig: msg.runConfig,
            ...(checkpointId && { checkpointId }),
          });
        }
      : undefined,
    ...(getCheckpointId || hasStagedMessages
      ? {
          onReload: async (parentId, config) => {
            queueRef.current?.clear();
            const stagedRun = getStagedRun(parentId);
            if (stagedRun) {
              for (const message of stagedRun.messages) {
                if (message.id) stagedMessagesRef.current.delete(message.id);
              }
              setStagedMessageCount(stagedMessagesRef.current.size);
              return handleSendMessage(stagedRun.messages, {
                runConfig: config.runConfig ?? stagedRun.runConfig,
              });
            }

            if (!getCheckpointId)
              throw new Error("Runtime does not support reloading messages.");

            toolResultBuffersRef.current.clear();
            runConfigByToolCallIdRef.current.clear();
            groupKeyByToolCallIdRef.current.clear();
            pendingResumeRef.current.clear();
            runQueue.drop();
            const truncated = truncateLangChainMessages(
              threadMessagesRef.current,
              parentId,
            );
            setMessages(truncated);
            setUIMessages(
              filterUIMessagesBySurvivingIds(uiMessagesRef.current, truncated),
            );
            setInterrupt(undefined);
            const externalId = aui.threadListItem.getState().externalId;
            const checkpointId = externalId
              ? await getCheckpointId(externalId, truncated)
              : null;
            return handleSendMessage([], {
              runConfig: config.runConfig,
              ...(checkpointId && { checkpointId }),
            });
          },
        }
      : {}),
    onCancel: unstable_allowCancellation
      ? async () => cancelActiveRun()
      : undefined,
    ...(load !== undefined && {
      onRefetchThread: () => runLoad("reload"),
    }),
  });

  return runtime;
};

export const useLangGraphRuntime = ({
  cloud,
  unstable_threadListAdapter,
  create,
  delete: deleteFn,
  onThreadIdChange,
  threadId,
  initialThreadId,
  ...options
}: UseLangGraphRuntimeOptions) => {
  const aui = useAui();
  const cloudAdapter = useCloudThreadListAdapter({
    cloud,
    create: async () => {
      if (create) {
        return create();
      }

      if (aui.threadListItem.source) {
        return aui.threadListItem.initialize();
      }

      return { externalId: undefined };
    },
    delete: deleteFn,
  });

  const adapter = unstable_threadListAdapter ?? cloudAdapter;

  return useRemoteThreadListRuntime({
    runtimeHook: function RuntimeHook() {
      return useLangGraphRuntimeImpl(options);
    },
    adapter,
    allowNesting: true,
    onThreadIdChange,
    threadId,
    initialThreadId,
  });
};
