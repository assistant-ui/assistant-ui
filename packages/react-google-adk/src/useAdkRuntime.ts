import {
  useCallback,
  useEffect,
  useInsertionEffect,
  useMemo,
  useRef,
  useState,
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
} from "@assistant-ui/core/internal";
import {
  useCloudThreadListAdapter,
  useRemoteThreadListRuntime,
  useExternalMessageConverter,
  useExternalStoreRuntime,
} from "@assistant-ui/core/react";
import { useAui } from "@assistant-ui/store";
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
import { useAdkMessages } from "./useAdkMessages";
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
import { adkExtras } from "./adkExtras";

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
    replaceMessages,
    applySnapshot,
  } = useAdkMessages({
    stream,
    ...(eventHandlers && { eventHandlers }),
  });

  const loadRef = useRef(load);
  useInsertionEffect(() => {
    loadRef.current = load;
  }, [load]);
  const loadController = useMemo(createAbortableThreadLoad, []);
  const messagesRef = useRef(messages);
  useInsertionEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
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
  const runGenerationRef = useRef(0);

  const handleSendMessage = async (
    msgs: AdkMessage[],
    config: AdkSendMessageConfig,
  ) => {
    const generation = ++runGenerationRef.current;
    try {
      setIsRunning(true);
      await sendMessage(msgs, config);
    } finally {
      if (runGenerationRef.current === generation) setIsRunning(false);
    }
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

  const stagedMessagesRef = useRef(
    new Map<
      string,
      {
        message: AdkMessage & { id: string };
        runConfig: AppendMessage["runConfig"];
      }
    >(),
  );
  const [stagedMessageCount, setStagedMessageCount] = useState(0);
  const hasStagedMessages = stagedMessageCount > 0;

  const getStagedRun = (parentId: string | null) => {
    if (!parentId || !stagedMessagesRef.current.has(parentId)) return null;

    const staged: AdkMessage[] = [];
    for (const message of adkMessagesRef.current) {
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
    const stagedMessage = toAdkUserMessage(msg);
    stagedMessagesRef.current.set(stagedMessage.id, {
      message: stagedMessage,
      runConfig: msg.runConfig,
    });
    setStagedMessageCount(stagedMessagesRef.current.size);
    const nextMessages = [...adkMessagesRef.current, stagedMessage];
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
          applySnapshot(snapshot);
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

  useEffect(() => {
    runLoad();
    return () => {
      // Whatever is current, not this effect's own controller: a refetch swaps
      // the ref, and one in flight at unmount must be aborted too.
      loadController.abort();
      setIsLoadingThread(false);
    };
  }, [loadController, runLoad]);

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
      send: handleSendMessage,
    }),
    onNew: async (msg) => {
      if (!(msg.startRun ?? msg.role === "user")) {
        stageUserMessage(msg);
        return;
      }

      const cancellations =
        autoCancelPendingToolCalls !== false
          ? getPendingCancellations(messages, longRunningToolIds)
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
      );
    },
    onEdit: getCheckpointId
      ? async (msg) => {
          const truncated = truncateAdkMessages(
            threadMessagesRef.current,
            msg.parentId,
          );
          replaceMessages(truncated);
          if (!(msg.startRun ?? msg.role === "user")) {
            const stagedMessage = toAdkUserMessage(msg);
            stagedMessagesRef.current.set(stagedMessage.id, {
              message: stagedMessage,
              runConfig: msg.runConfig,
            });
            setStagedMessageCount(stagedMessagesRef.current.size);
            const nextMessages = [...truncated, stagedMessage];
            adkMessagesRef.current = nextMessages;
            setMessages(nextMessages);
            return;
          }
          const externalId = aui.threadListItem.getState().externalId;
          const checkpointId = externalId
            ? await getCheckpointId(externalId, truncated)
            : null;
          return handleSendMessage(
            [
              {
                id: generateId(),
                type: "human",
                content: getMessageContent(msg),
              },
            ],
            {
              runConfig: msg.runConfig,
              ...(checkpointId && { checkpointId }),
            },
          );
        }
      : undefined,
    ...(getCheckpointId || hasStagedMessages
      ? {
          onReload: async (parentId, config) => {
            const stagedRun = getStagedRun(parentId);
            if (stagedRun) {
              for (const message of stagedRun.messages) {
                stagedMessagesRef.current.delete(message.id);
              }
              setStagedMessageCount(stagedMessagesRef.current.size);
              return handleSendMessage(stagedRun.messages, {
                runConfig: config.runConfig ?? stagedRun.runConfig,
              });
            }

            if (!getCheckpointId)
              throw new Error("Runtime does not support reloading messages.");

            const truncated = truncateAdkMessages(
              threadMessagesRef.current,
              parentId,
            );
            replaceMessages(truncated);
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
    onAddToolResult: async ({
      toolCallId,
      toolName,
      result,
      isError,
      artifact,
    }) => {
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
          cancel();
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
  sessionAdapter,
  create,
  delete: deleteFn,
  onThreadIdChange,
  ...options
}: UseAdkRuntimeOptions) => {
  const aui = useAui();
  const cloudAdapter = useCloudThreadListAdapter({
    cloud,
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
