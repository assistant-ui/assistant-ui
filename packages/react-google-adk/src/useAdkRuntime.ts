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
  projectAdkToolApprovals,
  toAdkToolConfirmationReply,
} from "./adkToolApproval";
import { INTERRUPT_TOOL_NAMES } from "./adkThreadState";
import { adkExtras } from "./adkExtras";
import { ADK_SDK } from "./sdkIdentity";

const overlayBufferedToolResults = (
  messages: AdkMessage[],
  bufferedResults: ReadonlyMap<string, Extract<AdkMessage, { type: "tool" }>>,
): AdkMessage[] => {
  if (bufferedResults.size === 0) return messages;
  const ids = new Set(messages.map((message) => message.id));
  return [
    ...messages,
    ...[...bufferedResults.values()].filter((message) => !ids.has(message.id)),
  ];
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
  const {
    controller,
    messages: publishedMessages,
    stateDelta,
    agentInfo,
    longRunningToolIds,
    artifactDelta,
    toolConfirmations,
    authRequests,
    escalated,
    messageMetadata,
    sendMessageWithExecutor,
    cancel,
    setMessages,
    replaceMessages: replaceAdkMessages,
    applySnapshot: applyAdkSnapshot,
  } = useAdkMessagesInternal({
    stream,
    ...(eventHandlers && { eventHandlers }),
  });
  const threadState = useSyncExternalStore(
    controller.subscribe,
    controller.getState,
    controller.getState,
  );
  const messages = useMemo(
    () =>
      overlayBufferedToolResults(
        publishedMessages,
        threadState.toolResultBuffer,
      ),
    [publishedMessages, threadState.toolResultBuffer],
  );

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
  const applySnapshot = useCallback(
    (snapshot: AdkThreadSnapshot) => {
      controller.dispatch({
        type: "messages.seed",
        history: snapshot.messages,
      });
      applyAdkSnapshot(snapshot);
    },
    [applyAdkSnapshot, controller],
  );
  const replaceMessages = useCallback(
    (nextMessages: AdkMessage[]) => {
      controller.dispatch({ type: "messages.prune", history: nextMessages });
      replaceAdkMessages(nextMessages);
    },
    [controller, replaceAdkMessages],
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
    const runId = controller.dispatch({ type: "run.active" }).currentRunId!;
    let failed = false;
    try {
      setIsRunning(true);
      await run(lease.isCurrent);
    } catch (error) {
      failed = true;
      throw error;
    } finally {
      const wasActive = controller.getState().activeRunIds.has(runId);
      failed ||= controller.getState().failedRunIds.has(runId);
      controller.dispatch({ type: "run.finished", runId });
      if (lease.isCurrent()) setIsRunning(false);
      if (wasActive && lease.isCurrent()) {
        const batch = controller.dispatch({
          type: "results.flush",
          runId,
          failed,
        }).readyBatch;
        if (batch) await handleSendMessage(batch, {});
      }
    }
  };

  const handleSendMessage = (
    msgs: AdkMessage[],
    config: AdkSendMessageConfig,
  ) => {
    const isToolContinuation =
      msgs.length > 0 && msgs.every((msg) => msg.type === "tool");
    const continuationConfig =
      isToolContinuation && config.runConfig === undefined
        ? {
            ...config,
            runConfig: controller
              .getState()
              .runConfigByToolCallId.get(msgs[0]!.tool_call_id),
          }
        : config;

    return sendMessageWithExecutor(msgs, continuationConfig, (run) =>
      runExclusive(() => run()),
    );
  };

  const receiveToolResult = async (
    message: Extract<AdkMessage, { type: "tool" }>,
  ) => {
    const batch = controller.dispatch({
      type: "results.received",
      message,
    }).readyBatch;
    if (batch) await handleSendMessage(batch, {});
  };

  const stopRun = () => {
    controller.dispatch({ type: "run.cancelled" });
    runLeases.invalidate();
    setIsRunning(false);
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

  // Staging assigns adkMessagesRef.current directly, so the effect must key on
  // the committed messages alone; a dep-less publication would clobber the
  // optimistic value on any unrelated commit.
  const adkMessagesRef = useRef(messages);
  useInsertionEffect(() => {
    adkMessagesRef.current = messages;
  }, [messages]);

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
      if (purpose === "reload") controller.dispatch({ type: "results.clear" });
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
    [threadListItem, loadController, applySnapshot, controller],
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
      controller.dispatch({ type: "run.cancelled" });
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
        const send = () =>
          messages.length === 1 &&
          messages[0]!.type === "tool" &&
          INTERRUPT_TOOL_NAMES.has(messages[0]!.name) &&
          Object.keys(config).length === 0
            ? receiveToolResult(messages[0]!)
            : handleSendMessage(messages, config);
        if (!initialLoad) return send();
        return initialLoad.then(({ active }) => (active ? send() : undefined));
      },
    }),
    onNew: async (msg) => {
      const pendingInitialLoad = waitForInitialLoad();
      const initialLoad = pendingInitialLoad
        ? await pendingInitialLoad
        : undefined;
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
      const bufferedResults =
        controller.dispatch({ type: "run.newTurn" }).readyBatch ?? [];
      const answeredIds = new Set(
        bufferedResults.map((result) => result.tool_call_id),
      );

      return handleSendMessage(
        [
          ...bufferedResults,
          ...cancellations.filter(
            (cancellation) =>
              cancellation.type !== "tool" ||
              !answeredIds.has(cancellation.tool_call_id),
          ),
          {
            id: generateId(),
            type: "human",
            content: getMessageContent(msg),
          },
        ],
        { runConfig: msg.runConfig },
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
          const lease = runLeases.begin();
          setIsRunning(true);
          try {
            const checkpointId = externalId
              ? await getCheckpointId(externalId, truncated)
              : null;
            if (!lease.isCurrent()) return;
            return await handleSendMessage([editedMessage], {
              runConfig: msg.runConfig,
              ...(checkpointId && { checkpointId }),
            });
          } finally {
            if (lease.isCurrent()) setIsRunning(false);
          }
        }
      : undefined,
    ...(getCheckpointId || hasStagedMessages
      ? {
          onReload: async (parentId, config) => {
            controller.dispatch({ type: "results.clear" });
            const initialLoad = waitForInitialLoad();
            if (initialLoad && !(await initialLoad).active) return;
            const stagedRun = controller.getStagedRun(parentId);
            if (stagedRun) {
              controller.dispatch({
                type: "staged.unstage",
                ids: stagedRun.messages.map((message) => message.id!),
              });
              return handleSendMessage(stagedRun.messages, {
                runConfig: config.runConfig ?? stagedRun.runConfig,
              });
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
            const lease = runLeases.begin();
            setIsRunning(true);
            const lookup = { lease, beforeReload };
            reloadLookupRef.current = lookup;
            try {
              let checkpointId: string | null;
              try {
                checkpointId = externalId
                  ? await getCheckpointId(externalId, truncated)
                  : null;
              } catch (error) {
                if (lease.isCurrent() && reloadLookupRef.current === lookup)
                  applySnapshot(beforeReload);
                throw error;
              } finally {
                if (reloadLookupRef.current === lookup)
                  reloadLookupRef.current = null;
              }
              if (!lease.isCurrent()) return;
              return await handleSendMessage([], {
                runConfig: config.runConfig,
                ...(checkpointId && { checkpointId }),
              });
            } finally {
              if (lease.isCurrent()) setIsRunning(false);
            }
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
      const message: Extract<AdkMessage, { type: "tool" }> = {
        id: generateId(),
        type: "tool",
        name: toolName,
        tool_call_id: toolCallId,
        content: JSON.stringify(result),
        artifact,
        status: isError ? "error" : "success",
      };
      await receiveToolResult(message);
    },
    onRespondToToolApproval: async (options) => {
      const initialLoad = waitForInitialLoad();
      if (initialLoad && !(await initialLoad).active) return;
      await receiveToolResult(
        toAdkToolConfirmationReply(
          options,
          projectAdkToolApprovals(adkMessagesRef.current).approvals,
        ),
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
