import {
  useCallback,
  useInsertionEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  pickExternalStoreSharedOptions,
  type AttachmentAdapter,
  type DictationAdapter,
  type ExternalStoreSharedOptions,
  type FeedbackAdapter,
  type RealtimeVoiceAdapter,
  type SpeechSynthesisAdapter,
  type AppendMessage,
  type ToolCallMessagePart,
  type ToolExecutionStatus,
  generateId,
} from "@assistant-ui/core";
import {
  createAbortableThreadLoad,
  createCloudThreadListAdapterCreateFallback,
  isRecord,
  RunLeases,
  type RunLease,
} from "@assistant-ui/core/internal";
import {
  useCloudThreadListAdapter,
  useRemoteThreadListRuntime,
  useExternalMessageConverter,
  useExternalStoreRuntime,
} from "@assistant-ui/core/react";
import { useAui } from "@assistant-ui/store";
import { useReplaySafeEffect } from "@assistant-ui/store/internal";
import type { AssistantCloud } from "assistant-cloud";
import type { RemoteThreadListAdapter } from "@assistant-ui/core";
import type {
  AdkMessage,
  AdkThreadSnapshot,
  AdkSendMessageConfig,
  AdkStreamCallback,
  OnAdkErrorCallback,
  OnAdkCustomEventCallback,
  OnAdkAgentTransferCallback,
} from "./types";
import { useAdkMessagesInternal } from "./useAdkMessages";
import {
  convertAdkMessage,
  createAdkMessageConverter,
} from "./convertAdkMessages";
import {
  getMessageContent,
  getPendingCancellations,
  toAdkUserMessage,
  truncateAdkMessages,
} from "./convertToAdkMessages";
import {
  ADK_REQUEST_CONFIRMATION,
  projectAdkToolApprovals,
  toAdkToolConfirmationReply,
} from "./adkToolApproval";
import { ADK_REQUEST_CREDENTIAL } from "./adkAuthRequest";
import { adkExtras } from "./adkExtras";
import { ADK_SDK } from "./sdkIdentity";

const HITL_REPLY_TOOL_NAMES = new Set([
  ADK_REQUEST_CONFIRMATION,
  ADK_REQUEST_CREDENTIAL,
  "adk_request_input",
]);

type PendingHitlReplies = {
  runId: number | undefined;
  messages: AdkMessage[];
  config: AdkSendMessageConfig;
  waiters: { resolve: () => void; reject: (error: unknown) => void }[];
  completion?: Promise<boolean>;
  discarded?: boolean;
  lifecycle?: HitlReplyLifecycle;
};

type HitlReplyLifecycle = {
  rollbackSnapshot: AdkThreadSnapshot;
  responseReceived: boolean;
};

export type UseAdkRuntimeOptions = ExternalStoreSharedOptions & {
  stream: AdkStreamCallback;
  /**
   * Called whenever the active thread's canonical (remote) ID changes, so the
   * value can be treated as a managed/controlled variable (e.g. synced to a URL
   * query param). Only the settled remote ID is emitted: while a freshly created
   * thread is still optimistic the value is `undefined`, and the real ID is
   * emitted once the thread is initialized; the transient local ID is never
   * surfaced.
   */
  onThreadIdChange?: ((threadId: string | undefined) => void) | undefined;
  autoCancelPendingToolCalls?: boolean | undefined;
  /** @deprecated Experimental since 2025-01-03. Not scheduled for removal; the API may change in any release. */
  unstable_allowCancellation?: boolean | undefined;
  getCheckpointId?: (
    threadId: string,
    parentMessages: AdkMessage[],
  ) => Promise<string | null>;
  /**
   * Loads a thread's stored state. Called when the thread opens, and again for
   * `threads.reloadMainThread()`, which refetches in place rather than
   * remounting the runtime; the signal aborts a load the runtime no longer
   * needs.
   */
  load?: (
    threadId: string,
    options?: { signal?: AbortSignal | undefined },
  ) => Promise<AdkThreadSnapshot>;
  create?: () => Promise<{ externalId: string }>;
  delete?: (threadId: string) => Promise<void>;
  adapters?:
    | {
        attachments?: AttachmentAdapter;
        speech?: SpeechSynthesisAdapter;
        dictation?: DictationAdapter;
        voice?: RealtimeVoiceAdapter;
        feedback?: FeedbackAdapter;
      }
    | undefined;
  eventHandlers?:
    | {
        onError?: OnAdkErrorCallback;
        onCustomEvent?: OnAdkCustomEventCallback;
        onAgentTransfer?: OnAdkAgentTransferCallback;
      }
    | undefined;
  cloud?: AssistantCloud | undefined;
  /**
   * Stable identity for the account or workspace owning Cloud runtime state.
   * Provide it from the first render and change it when that scope changes.
   */
  scopeId?: string | undefined;
  /**
   * A `RemoteThreadListAdapter` to use instead of the cloud adapter.
   * Use with `createAdkSessionAdapter` for ADK session-backed persistence.
   */
  sessionAdapter?: RemoteThreadListAdapter | undefined;
};

const useAdkRuntimeImpl = (options: UseAdkRuntimeOptions) => {
  const {
    autoCancelPendingToolCalls,
    adapters: { attachments, dictation, feedback, speech, voice } = {},
    unstable_allowCancellation,
    stream,
    load,
    getCheckpointId,
    eventHandlers,
  } = options;
  const aui = useAui();
  const runConfigByToolCallIdRef = useRef(new Map<string, unknown>());
  const runIdByToolCallIdRef = useRef(new Map<string, number | undefined>());
  const currentRunIdRef = useRef<number | null>(null);
  const nextRunIdRef = useRef(0);
  const activeRunIdsRef = useRef(new Set<number>());
  const activeRunWaitersRef = useRef(new Set<() => void>());
  const hitlReplyGenerationRef = useRef(0);
  const pendingHitlRepliesRef = useRef(
    new Map<number | undefined, PendingHitlReplies>(),
  );
  const inFlightHitlRepliesRef = useRef<PendingHitlReplies | null>(null);
  const hitlFlushScheduledRef = useRef(false);
  const flushHitlRepliesRef = useRef<(() => void) | null>(null);

  const applyPendingHitlReplies = useCallback((messages: AdkMessage[]) => {
    const ids = new Set(messages.map((message) => message.id));
    const pendingMessages = [...pendingHitlRepliesRef.current.values()].flatMap(
      (batch) => batch.messages,
    );
    const additions = pendingMessages.filter((message) => !ids.has(message.id));
    return additions.length > 0 ? [...messages, ...additions] : messages;
  }, []);

  const clearPendingHitlReplies = useCallback(() => {
    hitlReplyGenerationRef.current++;
    const pending = [
      ...pendingHitlRepliesRef.current.values(),
      ...(inFlightHitlRepliesRef.current
        ? [inFlightHitlRepliesRef.current]
        : []),
    ];
    pendingHitlRepliesRef.current = new Map();
    inFlightHitlRepliesRef.current = null;
    for (const batch of pending.values()) {
      batch.discarded = true;
      for (const waiter of batch.waiters) waiter.resolve();
    }
  }, []);
  useReplaySafeEffect(() => clearPendingHitlReplies, [clearPendingHitlReplies]);

  const rememberMessageOwnership = useCallback(
    (newMessages: AdkMessage[], runConfig: unknown) => {
      const toolOwnership = runConfigByToolCallIdRef.current;
      const runOwnership = runIdByToolCallIdRef.current;
      for (const message of newMessages) {
        if (message.type !== "ai") continue;
        for (const toolCall of message.tool_calls ?? []) {
          if (!isRecord(toolCall)) continue;
          if (!toolOwnership.has(toolCall.id)) {
            toolOwnership.set(toolCall.id, runConfig);
            runOwnership.set(toolCall.id, currentRunIdRef.current ?? undefined);
          }
        }
      }
    },
    [],
  );

  const seedMessageOwnership = useCallback((history: AdkMessage[]) => {
    const currentOwnership = runConfigByToolCallIdRef.current;
    const currentRunOwnership = runIdByToolCallIdRef.current;
    const nextOwnership = new Map<string, unknown>();
    const nextRunOwnership = new Map<string, number | undefined>();
    for (const message of history) {
      if (message.type !== "ai") continue;
      for (const toolCall of message.tool_calls ?? []) {
        if (!isRecord(toolCall)) continue;
        // Loaded ids must remain present even without a local owner because
        // streamed event windows use has() to avoid attributing them later.
        nextOwnership.set(
          toolCall.id,
          currentOwnership.has(toolCall.id)
            ? currentOwnership.get(toolCall.id)
            : undefined,
        );
        nextRunOwnership.set(toolCall.id, currentRunOwnership.get(toolCall.id));
      }
    }
    runConfigByToolCallIdRef.current = nextOwnership;
    runIdByToolCallIdRef.current = nextRunOwnership;
  }, []);

  const pruneMessageOwnership = useCallback((history: AdkMessage[]) => {
    const toolCallIds = new Set<string>();
    for (const message of history) {
      if (message.type !== "ai") continue;
      for (const toolCall of message.tool_calls ?? []) {
        if (!isRecord(toolCall)) continue;
        toolCallIds.add(toolCall.id);
      }
    }
    for (const id of runConfigByToolCallIdRef.current.keys()) {
      if (!toolCallIds.has(id)) runConfigByToolCallIdRef.current.delete(id);
    }
    for (const id of runIdByToolCallIdRef.current.keys()) {
      if (!toolCallIds.has(id)) runIdByToolCallIdRef.current.delete(id);
    }
  }, []);

  const getToolRunConfig = useCallback((toolCallId: string) => {
    return runConfigByToolCallIdRef.current.get(toolCallId);
  }, []);

  const {
    controller,
    messages,
    stateDelta,
    agentInfo,
    longRunningToolIds,
    artifactDelta,
    toolConfirmations,
    authRequests,
    escalated,
    messageMetadata,
    sendMessage,
    cancel,
    setMessages,
    replaceMessages: replaceAdkMessages,
    applySnapshot: applyAdkSnapshot,
  } = useAdkMessagesInternal({
    stream,
    ...(eventHandlers && { eventHandlers }),
    onMessages: rememberMessageOwnership,
    applyMessageOverlay: applyPendingHitlReplies,
  });

  const loadRef = useRef(load);
  useInsertionEffect(() => {
    loadRef.current = load;
  }, [load]);
  const [loadController] = useState(createAbortableThreadLoad);
  const initialLoadRef = useRef<{
    promise: Promise<void>;
    active: boolean;
    snapshot: AdkThreadSnapshot | undefined;
  } | null>(null);
  const waitForInitialLoad = () => {
    const load = initialLoadRef.current;
    if (!load) return undefined;
    return load.promise.then(() => ({
      active:
        load.active &&
        (!threadListItem ||
          aui.threads.getState().mainThreadId === threadListItem.getState().id),
      snapshot: load.snapshot,
    }));
  };
  const messagesRef = useRef(messages);
  useInsertionEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  // Staging and queued replies assign this ref directly, so the effect must
  // key on committed messages alone or an unrelated commit can clobber them.
  const adkMessagesRef = useRef(messages);
  useInsertionEffect(() => {
    adkMessagesRef.current = messages;
  }, [messages]);
  const applySnapshot = useCallback(
    (snapshot: AdkThreadSnapshot) => {
      clearPendingHitlReplies();
      seedMessageOwnership(snapshot.messages);
      applyAdkSnapshot(snapshot);
    },
    [applyAdkSnapshot, clearPendingHitlReplies, seedMessageOwnership],
  );
  const replaceMessages = useCallback(
    (nextMessages: AdkMessage[]) => {
      clearPendingHitlReplies();
      pruneMessageOwnership(nextMessages);
      replaceAdkMessages(nextMessages);
    },
    [clearPendingHitlReplies, pruneMessageOwnership, replaceAdkMessages],
  );
  const [isLoadingThread, setIsLoadingThread] = useState(
    () =>
      load !== undefined && aui.threadListItem.getState().externalId != null,
  );

  const [isRunning, setIsRunning] = useState(false);
  const [toolStatuses, setToolStatuses] = useState<
    Record<string, ToolExecutionStatus>
  >({});
  const hasExecutingTools = Object.values(toolStatuses).some(
    (s) => s?.type === "executing",
  );
  const effectiveIsRunning = isRunning || hasExecutingTools;
  const isRunningRef = useRef(effectiveIsRunning);
  useInsertionEffect(() => {
    isRunningRef.current = effectiveIsRunning;
  }, [effectiveIsRunning]);
  const [runLeases] = useState(() => new RunLeases());
  const reloadLookupRef = useRef<{
    lease: RunLease;
    beforeReload: AdkThreadSnapshot;
  } | null>(null);

  const runExclusive = async (
    run: (isCurrent: () => boolean) => Promise<void>,
  ) => {
    const lease = runLeases.begin();
    const runId = ++nextRunIdRef.current;
    currentRunIdRef.current = runId;
    activeRunIdsRef.current.add(runId);
    try {
      setIsRunning(true);
      await run(lease.isCurrent);
    } finally {
      activeRunIdsRef.current.delete(runId);
      if (currentRunIdRef.current === runId) currentRunIdRef.current = null;
      if (lease.isCurrent()) setIsRunning(false);
      flushHitlRepliesRef.current?.();
      if (activeRunIdsRef.current.size === 0) {
        for (const resolve of activeRunWaitersRef.current) resolve();
        activeRunWaitersRef.current.clear();
      }
    }
  };

  const sendImmediately = (
    msgs: AdkMessage[],
    config: AdkSendMessageConfig,
    lifecycle?: HitlReplyLifecycle,
  ) => {
    const isToolContinuation =
      msgs.length > 0 && msgs.every((msg) => msg.type === "tool");
    const continuationConfig =
      isToolContinuation && config.runConfig === undefined
        ? {
            ...config,
            runConfig: getToolRunConfig(msgs[0]!.tool_call_id),
          }
        : config;

    return runExclusive(() => sendMessage(msgs, continuationConfig, lifecycle));
  };

  const discardPendingHitlReplies = () => {
    const inFlight = inFlightHitlRepliesRef.current;
    const discardInFlight = !inFlight?.lifecycle?.responseReceived;
    const batches = [
      ...pendingHitlRepliesRef.current.values(),
      ...(inFlight && discardInFlight ? [inFlight] : []),
    ];
    const ids = new Set(
      batches.flatMap((batch) => batch.messages.map((message) => message.id)),
    );
    const toolCallIds = new Set(
      batches.flatMap((batch) =>
        batch.messages.flatMap((message) =>
          message.type === "tool" ? [message.tool_call_id] : [],
        ),
      ),
    );
    clearPendingHitlReplies();
    const rollbackSnapshot = discardInFlight
      ? inFlight?.lifecycle?.rollbackSnapshot
      : undefined;
    if (rollbackSnapshot) {
      const messages = controller
        .getState()
        .messages.filter(
          (message) =>
            !ids.has(message.id) &&
            !(message.type === "tool" && toolCallIds.has(message.tool_call_id)),
        );
      adkMessagesRef.current = messages;
      applySnapshot({ ...rollbackSnapshot, messages });
      return;
    }
    if (ids.size === 0) return;

    const currentMessages = controller.getState().messages;
    const nextMessages = currentMessages.filter(
      (message) =>
        !ids.has(message.id) &&
        !(message.type === "tool" && toolCallIds.has(message.tool_call_id)),
    );
    if (nextMessages.length === currentMessages.length) return;
    adkMessagesRef.current = nextMessages;
    setMessages(nextMessages);
  };

  const scheduleHitlReplyFlush = () => {
    if (
      activeRunIdsRef.current.size > 0 ||
      inFlightHitlRepliesRef.current ||
      hitlFlushScheduledRef.current
    )
      return;
    hitlFlushScheduledRef.current = true;
    queueMicrotask(() => {
      hitlFlushScheduledRef.current = false;
      if (activeRunIdsRef.current.size > 0 || inFlightHitlRepliesRef.current)
        return;
      const batches = pendingHitlRepliesRef.current;
      const nextBatch = [...batches.entries()].find(
        ([runId]) => runId === undefined || !activeRunIdsRef.current.has(runId),
      );
      if (!nextBatch) return;
      const [runId, pending] = nextBatch;
      batches.delete(runId);
      const currentState = controller.getState();
      const pendingBatches = [pending, ...batches.values()];
      const pendingIds = new Set(
        pendingBatches.flatMap((batch) =>
          batch.messages.map((message) => message.id),
        ),
      );
      const pendingToolCallIds = new Set(
        pendingBatches.flatMap((batch) =>
          batch.messages.flatMap((message) =>
            message.type === "tool" ? [message.tool_call_id] : [],
          ),
        ),
      );
      const rollbackSnapshot: AdkThreadSnapshot = {
        messages: currentState.messages.filter(
          (message) =>
            !pendingIds.has(message.id) &&
            !(
              message.type === "tool" &&
              pendingToolCallIds.has(message.tool_call_id)
            ),
        ),
        longRunningToolIds: currentState.longRunningToolIds,
        toolConfirmations: currentState.toolConfirmations,
        authRequests: currentState.authRequests,
        escalated: currentState.escalated,
        messageMetadata: currentState.messageMetadata,
        stateDelta: currentState.stateDelta,
        artifactDelta: currentState.artifactDelta,
        agentInfo: currentState.agentInfo,
      };
      pending.lifecycle = {
        rollbackSnapshot,
        responseReceived: false,
      };
      inFlightHitlRepliesRef.current = pending;
      let complete!: (shouldContinue: boolean) => void;
      pending.completion = new Promise<boolean>((resolve) => {
        complete = resolve;
      });
      void sendImmediately(pending.messages, pending.config, pending.lifecycle)
        .then(
          () => pending.waiters.forEach((waiter) => waiter.resolve()),
          (error: unknown) =>
            pending.waiters.forEach((waiter) => waiter.reject(error)),
        )
        .finally(() => {
          complete(!pending.discarded);
          if (inFlightHitlRepliesRef.current === pending) {
            inFlightHitlRepliesRef.current = null;
          }
          scheduleHitlReplyFlush();
        });
    });
  };
  flushHitlRepliesRef.current = scheduleHitlReplyFlush;

  const handleSendMessage = (
    msgs: AdkMessage[],
    config: AdkSendMessageConfig,
    supersedesPendingHitlReplies = false,
  ) => {
    const isHitlReplyBatch =
      msgs.length > 0 &&
      msgs.every(
        (message) =>
          message.type === "tool" && HITL_REPLY_TOOL_NAMES.has(message.name),
      );
    if (!isHitlReplyBatch) {
      if (supersedesPendingHitlReplies) {
        discardPendingHitlReplies();
      } else {
        if (
          pendingHitlRepliesRef.current.size > 0 &&
          activeRunIdsRef.current.size > 0
        ) {
          const generation = hitlReplyGenerationRef.current;
          return new Promise<void>((resolve, reject) => {
            activeRunWaitersRef.current.add(() => {
              if (generation !== hitlReplyGenerationRef.current) {
                resolve();
                return;
              }
              scheduleHitlReplyFlush();
              queueMicrotask(() => {
                if (generation !== hitlReplyGenerationRef.current) {
                  resolve();
                  return;
                }
                void handleSendMessage(msgs, config).then(resolve, reject);
              });
            });
          });
        }
        const inFlight = inFlightHitlRepliesRef.current;
        if (inFlight?.completion) {
          return inFlight.completion.then((shouldContinue) =>
            shouldContinue ? sendImmediately(msgs, config) : undefined,
          );
        }
      }
      return sendImmediately(msgs, config);
    }

    return new Promise<void>((resolve, reject) => {
      const currentMessages = controller.getState().messages;
      const existingIds = new Set(currentMessages.map((message) => message.id));
      const additions = msgs.filter((message) => !existingIds.has(message.id));
      if (additions.length > 0) {
        const nextMessages = [...currentMessages, ...additions];
        adkMessagesRef.current = nextMessages;
        setMessages(nextMessages);
      }

      const runId = runIdByToolCallIdRef.current.get(
        msgs[0]!.type === "tool" ? msgs[0]!.tool_call_id : "",
      );
      const batches = pendingHitlRepliesRef.current;
      const pending = batches.get(runId) ?? {
        runId,
        messages: [],
        config,
        waiters: [],
      };
      pending.messages.push(...msgs);
      pending.waiters.push({ resolve, reject });
      batches.set(runId, pending);
      scheduleHitlReplyFlush();
    });
  };

  const stopRun = () => {
    runLeases.invalidate();
    setIsRunning(false);
    discardPendingHitlReplies();
    cancel();
  };

  const { approvals: toolApprovals, key: toolApprovalsKey } =
    projectAdkToolApprovals(messages);
  // The messageConverter memo below reads this during render, where the ref
  // must carry the same render's approvals; a commit-scoped write would feed
  // the memo the previous commit's approvals whenever the key changes. No
  // callback reads it — approval replies project from the committed messages.
  const toolApprovalsRef = useRef(toolApprovals);
  toolApprovalsRef.current = toolApprovals;

  const longRunningToolIdsRef = useRef(longRunningToolIds);
  useInsertionEffect(() => {
    longRunningToolIdsRef.current = longRunningToolIds;
  }, [longRunningToolIds]);
  // ADK resolves every call it did not mark long-running itself, and yields
  // that call to the client one or more events before its own response, so
  // only a long-running call is the client's to execute.
  const isClientToolCall = useCallback(
    (toolCall: ToolCallMessagePart) =>
      longRunningToolIdsRef.current.includes(toolCall.toolCallId),
    [],
  );

  const messageConverter = useMemo(
    () =>
      toolApprovalsKey === ""
        ? convertAdkMessage
        : createAdkMessageConverter(toolApprovalsRef.current),
    [toolApprovalsKey],
  );

  const threadMessages = useExternalMessageConverter({
    callback: messageConverter,
    messages,
    isRunning: effectiveIsRunning,
  });

  const threadMessagesRef = useRef(threadMessages);
  useInsertionEffect(() => {
    threadMessagesRef.current = threadMessages;
  }, [threadMessages]);

  const stagedMessageCount = useSyncExternalStore(
    controller.subscribe,
    controller.getStagedMessageCount,
    controller.getStagedMessageCount,
  );
  const hasStagedMessages = stagedMessageCount > 0;

  const stageUserMessage = (msg: AppendMessage) => {
    const stagedMessage = toAdkUserMessage(msg);
    controller.dispatch({
      type: "staged.stage",
      entry: { message: stagedMessage, runConfig: msg.runConfig },
    });
    const nextMessages = [...controller.getState().messages, stagedMessage];
    adkMessagesRef.current = nextMessages;
    setMessages(nextMessages);
  };

  // The scoped client, not `aui` itself: useAui returns a render-bound
  // instance, so depending on it would re-run the load on every render.
  const threadListItem =
    aui.threadListItem.source !== null ? aui.threadListItem : undefined;

  const runLoad = useCallback(
    (purpose: "initial" | "reload" = "initial") => {
      const loadFn = loadRef.current;
      if (!loadFn || !threadListItem) return Promise.resolve();

      const externalId = threadListItem.getState().externalId;
      if (externalId == null) return Promise.resolve();

      // The initial load is already fetching what a refetch would ask for, and
      // taking it over strands the thread's history if the refetch then fails.
      // Aborting a load the runtime no longer needs is not a failure.
      // A refetch reports the failure to whoever awaited it; the initial load
      // has no caller to tell.
      return loadController.run({
        purpose,
        load: async (signal) => {
          const messagesAtLoadStart = messagesRef.current;
          if (purpose === "initial") setIsLoadingThread(true);

          const snapshot = await loadFn(externalId, { signal });
          if (signal.aborted) return;
          // A snapshot the session assembled before a run cannot speak for what
          // that run has since produced, and an ADK id cannot correlate a
          // message sent optimistically with the one the session stored for it,
          // so there is nothing here that could merge the two. A refetch that
          // raced a run therefore defers to the run, whether the run started
          // during the load or was already streaming when it began.
          if (
            purpose === "reload" &&
            (isRunningRef.current ||
              messagesRef.current !== messagesAtLoadStart)
          )
            return;
          reloadLookupRef.current = null;
          applySnapshot(snapshot);
          messagesRef.current = snapshot.messages;
          adkMessagesRef.current = snapshot.messages;
          longRunningToolIdsRef.current = snapshot.longRunningToolIds ?? [];
          if (purpose === "initial" && initialLoadRef.current) {
            initialLoadRef.current.snapshot = snapshot;
          }
        },
        onSettled: () => {
          setIsLoadingThread(false);
        },
        onInitialError: (error) => {
          console.warn("Failed to load ADK session:", error);
        },
      });
    },
    [threadListItem, loadController, applySnapshot],
  );

  useReplaySafeEffect(() => {
    let release!: () => void;
    const barrier = {
      promise: new Promise<void>((resolve) => {
        release = resolve;
      }),
      active: true,
      snapshot: undefined as AdkThreadSnapshot | undefined,
    };
    initialLoadRef.current = barrier;
    const settle = () => {
      if (initialLoadRef.current === barrier) initialLoadRef.current = null;
      release();
    };
    void runLoad().then(settle, settle);
    return () => {
      barrier.active = false;
      // Whatever is current, not this effect's own controller: a refetch swaps
      // the ref, and one in flight at unmount must be aborted too.
      loadController.abort();
      settle();
      setIsLoadingThread(false);
    };
  }, [threadListItem]);

  const runtime = useExternalStoreRuntime({
    ...pickExternalStoreSharedOptions(options),
    isRunning,
    isLoading: isLoadingThread,
    messages: threadMessages,
    unstable_enableToolInvocations: true,
    unstable_isClientToolCall: isClientToolCall,
    setToolStatuses,
    adapters: { attachments, dictation, feedback, speech, voice },
    extras: adkExtras.provide({
      agentInfo,
      stateDelta,
      artifactDelta,
      longRunningToolIds,
      toolConfirmations,
      authRequests,
      escalated,
      messageMetadata,
      send: (messages, config) => {
        const initialLoad = waitForInitialLoad();
        if (!initialLoad) return handleSendMessage(messages, config);
        return initialLoad.then(({ active }) =>
          active ? handleSendMessage(messages, config) : undefined,
        );
      },
    }),
    onNew: async (msg) => {
      const initialLoad = await waitForInitialLoad();
      if (initialLoad && !initialLoad.active) return;
      if (!(msg.startRun ?? msg.role === "user")) {
        stageUserMessage(msg);
        return;
      }

      const cancellations =
        autoCancelPendingToolCalls !== false
          ? getPendingCancellations(
              initialLoad?.snapshot?.messages ?? messagesRef.current,
              initialLoad?.snapshot?.longRunningToolIds ??
                longRunningToolIdsRef.current,
            )
          : [];

      return handleSendMessage(
        [
          ...cancellations,
          {
            id: generateId(),
            type: "human",
            content: getMessageContent(msg),
          },
        ],
        { runConfig: msg.runConfig },
        true,
      );
    },
    onEdit: getCheckpointId
      ? async (msg) => {
          const initialLoad = waitForInitialLoad();
          if (initialLoad && !(await initialLoad).active) return;
          stopRun();
          const truncated = truncateAdkMessages(
            threadMessagesRef.current,
            msg.parentId,
          );
          replaceMessages(truncated);
          if (!(msg.startRun ?? msg.role === "user")) {
            const stagedMessage = toAdkUserMessage(msg);
            controller.dispatch({
              type: "staged.stage",
              entry: { message: stagedMessage, runConfig: msg.runConfig },
            });
            const nextMessages = [...truncated, stagedMessage];
            adkMessagesRef.current = nextMessages;
            setMessages(nextMessages);
            return;
          }
          const editedMessage = toAdkUserMessage(msg);
          setMessages([...truncated, editedMessage]);
          const externalId = aui.threadListItem.getState().externalId;
          return runExclusive(async (isCurrent) => {
            const checkpointId = externalId
              ? await getCheckpointId(externalId, truncated)
              : null;
            if (!isCurrent()) return;
            await sendMessage([editedMessage], {
              runConfig: msg.runConfig,
              ...(checkpointId && { checkpointId }),
            });
          });
        }
      : undefined,
    ...(getCheckpointId || hasStagedMessages
      ? {
          onReload: async (parentId, config) => {
            const initialLoad = waitForInitialLoad();
            if (initialLoad && !(await initialLoad).active) return;
            const stagedRun = controller.getStagedRun(parentId);
            if (stagedRun) {
              controller.dispatch({
                type: "staged.unstage",
                ids: stagedRun.messages.map((message) => message.id!),
              });
              return handleSendMessage(
                stagedRun.messages,
                {
                  runConfig: config.runConfig ?? stagedRun.runConfig,
                },
                true,
              );
            }

            if (!getCheckpointId)
              throw new Error("Runtime does not support reloading messages.");

            stopRun();
            const beforeReload: AdkThreadSnapshot = {
              messages: adkMessagesRef.current,
              longRunningToolIds,
              toolConfirmations,
              authRequests,
              escalated,
              messageMetadata,
              stateDelta,
              artifactDelta,
              agentInfo,
            };
            const truncated = truncateAdkMessages(
              threadMessagesRef.current,
              parentId,
            );
            replaceMessages(truncated);
            const externalId = aui.threadListItem.getState().externalId;
            return runExclusive(async (isCurrent) => {
              const lookup = {
                lease: runLeases.current(),
                beforeReload,
              };
              reloadLookupRef.current = lookup;
              let checkpointId: string | null;
              try {
                checkpointId = externalId
                  ? await getCheckpointId(externalId, truncated)
                  : null;
              } catch (error) {
                if (isCurrent() && reloadLookupRef.current === lookup)
                  applySnapshot(beforeReload);
                throw error;
              } finally {
                if (reloadLookupRef.current === lookup)
                  reloadLookupRef.current = null;
              }
              if (!isCurrent()) return;
              await sendMessage([], {
                runConfig: config.runConfig,
                ...(checkpointId && { checkpointId }),
              });
            });
          },
        }
      : {}),
    onAddToolResult: async ({
      toolCallId,
      toolName,
      result,
      isError,
      artifact,
    }) => {
      const initialLoad = waitForInitialLoad();
      if (initialLoad && !(await initialLoad).active) return;
      await handleSendMessage(
        [
          {
            id: generateId(),
            type: "tool",
            name: toolName,
            tool_call_id: toolCallId,
            content: JSON.stringify(result),
            artifact,
            status: isError ? "error" : "success",
          },
        ],
        {},
      );
    },
    onRespondToToolApproval: async (options) => {
      const initialLoad = waitForInitialLoad();
      if (initialLoad && !(await initialLoad).active) return;
      await handleSendMessage(
        [
          toAdkToolConfirmationReply(
            options,
            projectAdkToolApprovals(adkMessagesRef.current).approvals,
          ),
        ],
        {},
      );
    },
    onCancel: unstable_allowCancellation
      ? async () => {
          const lookup = reloadLookupRef.current;
          const beforeReload = lookup?.lease.isCurrent()
            ? lookup.beforeReload
            : undefined;
          stopRun();
          // A reload stopped before it sent leaves the ADK session holding the
          // turn it removed, so the thread shows that turn again.
          if (beforeReload) applySnapshot(beforeReload);
        }
      : undefined,
    ...(load !== undefined && {
      onRefetchThread: () => runLoad("reload"),
    }),
  });

  return runtime;
};

export const useAdkRuntime = ({
  cloud,
  scopeId,
  sessionAdapter,
  create,
  delete: deleteFn,
  onThreadIdChange,
  ...options
}: UseAdkRuntimeOptions) => {
  const aui = useAui();
  const cloudAdapter = useCloudThreadListAdapter({
    sdk: ADK_SDK,
    cloud,
    scopeId,
    create: createCloudThreadListAdapterCreateFallback(
      create,
      aui.threadListItem,
    ),
    delete: deleteFn,
  });

  const adapter = sessionAdapter ?? cloudAdapter;

  return useRemoteThreadListRuntime({
    runtimeHook: function RuntimeHook() {
      return useAdkRuntimeImpl(options);
    },
    adapter,
    allowNesting: true,
    onThreadIdChange,
  });
};
