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
import { groupUIMessagesByParent } from "@assistant-ui/react-langchain/converter";
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
  createAbortableThreadLoad,
  createCloudThreadListAdapterCreateFallback,
  createToolCallCancellationStub,
} from "@assistant-ui/core/internal";
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
  type LangGraphInterruptState,
  type LangGraphSendMessageConfig,
  useLangGraphMessagesInternal,
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

  const runConfigByMessageIdRef = useRef(new Map<string, unknown>());
  const runConfigByToolCallIdRef = useRef(new Map<string, unknown>());
  const runIdByMessageIdRef = useRef(new Map<string, string>());
  const runIdByToolCallIdRef = useRef(new Map<string, string>());
  const currentRunIdRef = useRef<string | null>(null);
  const nextRunIdRef = useRef(0);
  const interruptRunConfigRef = useRef<unknown>(undefined);

  const rememberMessageOwnership = useCallback(
    (newMessages: LangChainMessage[], runConfig: unknown) => {
      const messageOwnership = runConfigByMessageIdRef.current;
      const toolOwnership = runConfigByToolCallIdRef.current;
      const runId = currentRunIdRef.current;
      for (const message of newMessages) {
        if (message.type !== "ai") continue;
        let owner = runConfig;
        const isNewMessage = Boolean(
          message.id && !messageOwnership.has(message.id),
        );
        if (message.id) {
          if (isNewMessage) messageOwnership.set(message.id, runConfig);
          owner = messageOwnership.get(message.id);
          if (runId && isNewMessage)
            runIdByMessageIdRef.current.set(message.id, runId);
        }
        for (const toolCall of message.tool_calls ?? []) {
          const isNewTool = !toolOwnership.has(toolCall.id);
          if (isNewTool) toolOwnership.set(toolCall.id, owner);
          if (runId && isNewTool)
            runIdByToolCallIdRef.current.set(toolCall.id, runId);
        }
      }
    },
    [],
  );

  const seedMessageOwnership = useCallback((history: LangChainMessage[]) => {
    const messageOwnership = runConfigByMessageIdRef.current;
    const toolOwnership = runConfigByToolCallIdRef.current;
    for (const message of history) {
      if (message.type !== "ai") continue;
      let owner: unknown = undefined;
      if (message.id) {
        if (!messageOwnership.has(message.id))
          messageOwnership.set(message.id, undefined);
        owner = messageOwnership.get(message.id);
      }
      for (const toolCall of message.tool_calls ?? []) {
        if (!toolOwnership.has(toolCall.id))
          toolOwnership.set(toolCall.id, owner);
      }
    }
  }, []);

  const pruneMessageOwnership = useCallback((history: LangChainMessage[]) => {
    const messageIds = new Set<string>();
    const toolCallIds = new Set<string>();
    for (const message of history) {
      if (message.type !== "ai") continue;
      if (message.id) messageIds.add(message.id);
      for (const toolCall of message.tool_calls ?? [])
        toolCallIds.add(toolCall.id);
    }
    for (const id of runConfigByMessageIdRef.current.keys()) {
      if (!messageIds.has(id)) runConfigByMessageIdRef.current.delete(id);
    }
    for (const id of runConfigByToolCallIdRef.current.keys()) {
      if (!toolCallIds.has(id)) runConfigByToolCallIdRef.current.delete(id);
    }
    for (const id of runIdByMessageIdRef.current.keys()) {
      if (!messageIds.has(id)) runIdByMessageIdRef.current.delete(id);
    }
    for (const id of runIdByToolCallIdRef.current.keys()) {
      if (!toolCallIds.has(id)) runIdByToolCallIdRef.current.delete(id);
    }
  }, []);

  const rememberInterruptOwnership = useCallback(
    (
      nextInterrupt: LangGraphInterruptState | undefined,
      runConfig: unknown,
    ) => {
      interruptRunConfigRef.current =
        nextInterrupt === undefined ? undefined : runConfig;
    },
    [],
  );

  const getToolRunConfig = useCallback(
    (toolCallId: string, history: LangChainMessage[]) => {
      const toolOwnership = runConfigByToolCallIdRef.current;
      if (toolOwnership.has(toolCallId)) return toolOwnership.get(toolCallId);
      for (const message of history) {
        if (message.type !== "ai") continue;
        if (message.tool_calls?.some((toolCall) => toolCall.id === toolCallId))
          return runConfigByMessageIdRef.current.get(message.id ?? "");
      }
      return undefined;
    },
    [],
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
  } = useLangGraphMessagesInternal({
    appendMessage: appendLangChainChunk,
    stream,
    eventHandlers: wrappedEventHandlers,
    onMessages: rememberMessageOwnership,
    onInterrupt: rememberInterruptOwnership,
    ...(uiStateKey !== undefined && { uiStateKey }),
  });
  const interruptRef = useRef(interrupt);
  interruptRef.current = interrupt;

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
  // Buffers client tool results within a turn so parallel tool calls resume the
  // graph in one run once every pending call has a result. See bufferToolResult.
  const toolResultBufferRef = useRef<
    Map<string, LangChainMessage & { type: "tool" }>
  >(new Map());
  // Queued resume batches keyed by pending-call group. Sibling results that
  // arrive before the batch is sent merge here (they are not in `messages`
  // yet, so they still count as pending).
  const pendingResumeRef = useRef(
    new Map<string, (LangChainMessage & { type: "tool" })[]>(),
  );
  const queueRef = useRef<MessageQueueController | null>(null);
  // The purpose rides along because only a refetch may be superseded by a
  // send: aborting an initial load would strand its history and loading flag.
  const loadController = useMemo(createAbortableThreadLoad, []);
  const hasExecutingTools = Object.values(toolStatuses).some(
    (s) => s?.type === "executing",
  );
  const effectiveIsRunning = isRunning || hasExecutingTools;

  const messageTiming = useLangGraphStreamingTiming(
    messages,
    effectiveIsRunning,
  );

  const uiMessagesByParent = useMemo(
    () => groupUIMessagesByParent<UIMessage>(uiMessages),
    [uiMessages],
  );

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
  }> | null>(null);
  runQueueRef.current ??= createSerialRunQueue({
    run: ({ messages, config }, onComplete) => {
      currentRunIdRef.current = String(++nextRunIdRef.current);
      for (const [groupKey, batch] of pendingResumeRef.current) {
        if (batch === messages) {
          pendingResumeRef.current.delete(groupKey);
          break;
        }
      }
      runErrorBalanceRef.current = 0;
      return sendMessageRef.current(messages, config, () => {
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
    runQueue.drop();
    queueRef.current?.clear();
    cancel();
  }, [runQueue, cancel]);

  const langGraphMessagesRef = useRef(messages);
  langGraphMessagesRef.current = messages;

  const handleSendMessage = (
    outgoing: LangChainMessage[],
    config: LangGraphSendMessageConfig,
  ) => {
    // Only a refetch: its landing snapshot would erase the message just sent.
    loadController.abort("reload");
    seedMessageOwnership(langGraphMessagesRef.current);
    const state = pendingStateRef.current;
    pendingStateRef.current = undefined;
    const runConfig =
      config.command != null &&
      config.runConfig === undefined &&
      interruptRef.current !== undefined
        ? interruptRunConfigRef.current
        : config.runConfig;
    const resolvedConfig =
      runConfig === config.runConfig ? config : { ...config, runConfig };
    return runQueue.enqueue({
      messages: outgoing,
      config: state ? { ...resolvedConfig, state } : resolvedConfig,
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
    toolResultBufferRef.current.clear();
    pendingResumeRef.current.clear();
    interruptRunConfigRef.current = undefined;
    runQueue.drop();
    const cancellations =
      autoCancelPendingToolCalls !== false
        ? getPendingToolCalls(messages).map(
            (t) =>
              createToolCallCancellationStub(t) satisfies LangChainMessage & {
                type: "tool";
              },
          )
        : [];

    const humanMessage = toLangGraphUserMessage(msg);
    stageAttachments(humanMessage.id, msg.attachments);
    return handleSendMessage([...cancellations, humanMessage], {
      runConfig: msg.runConfig,
    });
  };

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
      // Settle with the load deferred to, so awaiting a refetch still means
      // the thread is fresh.
      // The load rejects so a refetch deferring to it learns of the failure;
      // only the initial load's caller swallows it.
      return loadController.run({
        purpose,
        load: async (signal) => {
          const messagesAtLoadStart = langGraphMessagesRef.current;
          const uiMessagesAtLoadStart = uiMessagesRef.current;
          const interruptAtLoadStart = interruptRef.current;

          if (purpose === "initial") {
            toolResultBufferRef.current.clear();
            pendingStateRef.current = undefined;
            effectiveStateRef.current = undefined;
            runConfigByMessageIdRef.current.clear();
            runConfigByToolCallIdRef.current.clear();
            runIdByMessageIdRef.current.clear();
            runIdByToolCallIdRef.current.clear();
            interruptRunConfigRef.current = undefined;
            setOptimisticState(undefined);
            setValues(undefined);
            setIsLoadingThread(true);
          }
          // A refetch touches nothing else: the load boundary already decides
          // what a run started since keeps, so it needs no reset and no cancel.
          const { messages, interrupts, uiMessages } = await load(externalId, {
            signal,
          });
          if (signal.aborted) return;
          // Only an initial load is the whole thread; a refetch can race
          // output the server has not stored yet.
          const opts = { snapshotIsComplete: purpose === "initial" };
          reconcileMessages(messages, messagesAtLoadStart, opts);
          seedMessageOwnership(messages);
          reconcileUIMessages(uiMessages ?? [], uiMessagesAtLoadStart, opts);
          reconcileInterrupt(interrupts?.[0], interruptAtLoadStart);
        },
        onSettled: () => {
          setIsLoadingThread(false);
        },
        onInitialError: (error) => {
          console.warn("useLangGraphRuntime: load handler rejected", error);
        },
      });
    },
    [
      threadListItem,
      loadController,
      setValues,
      reconcileMessages,
      seedMessageOwnership,
      reconcileUIMessages,
      reconcileInterrupt,
    ],
  );

  useEffect(() => {
    runLoad();
    return () => {
      // Whatever is current, not this effect's own controller: a refetch swaps
      // the ref, and one in flight at unmount must be aborted too.
      loadController.abort();
      setIsLoadingThread(false);
    };
  }, [loadController, runLoad]);

  useEffect(() => cancelActiveRun, [cancelActiveRun]);

  const runtime = useExternalStoreRuntime({
    ...pickExternalStoreSharedOptions(options),
    isRunning,
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
      const pendingGroup = getPendingToolCallGroups(messages, (message) => {
        if (message.id) {
          const runId = runIdByMessageIdRef.current.get(message.id);
          if (runId) return `run:${runId}`;
        }
        for (const toolCall of message.tool_calls ?? []) {
          const runId = runIdByToolCallIdRef.current.get(toolCall.id);
          if (runId) return `run:${runId}`;
        }
        return "run:unknown";
      }).find((group) =>
        group.toolCalls.some((toolCall) => toolCall.id === toolCallId),
      );
      const groupKey = pendingGroup?.key ?? `late:${toolCallId}`;
      const queuedResume = pendingResumeRef.current.get(groupKey);
      const queuedIds = new Set(queuedResume?.map((m) => m.tool_call_id));
      const batch = bufferToolResult(
        toolResultBufferRef.current,
        (pendingGroup?.toolCalls ?? []).filter((t) => !queuedIds.has(t.id)),
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
          const index = queuedResume.findIndex(
            (m) => m.tool_call_id === message.tool_call_id,
          );
          if (index >= 0) queuedResume[index] = message;
          else queuedResume.push(message);
        }
        return;
      }
      const runConfig = batch
        .map((message) => getToolRunConfig(message.tool_call_id, messages))
        .find((config) => config !== undefined);
      pendingResumeRef.current.set(groupKey, batch);
      try {
        await handleSendMessage(batch, { runConfig });
      } catch (error) {
        if (!(error instanceof SerialRunQueueDropError)) throw error;
      } finally {
        if (pendingResumeRef.current.get(groupKey) === batch) {
          pendingResumeRef.current.delete(groupKey);
        }
      }
    },
    onEdit: getCheckpointId
      ? async (msg) => {
          toolResultBufferRef.current.clear();
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
          pruneMessageOwnership(truncated);
          interruptRunConfigRef.current = undefined;
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

            toolResultBufferRef.current.clear();
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
            pruneMessageOwnership(truncated);
            interruptRunConfigRef.current = undefined;
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
    create: createCloudThreadListAdapterCreateFallback(
      create,
      aui.threadListItem,
    ),
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
