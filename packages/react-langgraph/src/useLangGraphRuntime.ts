import {
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
import { createSerialRunQueue, type SerialRunQueue } from "./serialRunQueue";
import { langGraphExtras } from "./runtimeExtras";
import {
  filterUIMessagesBySurvivingIds,
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
          cleanups.set(name, aui.dataRenderers().setDataUI(name, component));
          registered.set(name, component);
        }
      }
    }

    if (uiFallback !== fallbackRef.current) {
      fallbackCleanupRef.current?.();
      fallbackCleanupRef.current = uiFallback
        ? aui.dataRenderers().setFallbackDataUI(uiFallback)
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
      }) satisfies UseLangGraphRuntimeOptions["eventHandlers"],
    [eventHandlers],
  );

  const {
    interrupt,
    setInterrupt,
    messages,
    messageMetadata,
    uiMessages,
    sendMessage,
    cancel,
    setMessages,
    setUIMessages,
  } = useLangGraphMessages({
    appendMessage: appendLangChainChunk,
    stream,
    eventHandlers: wrappedEventHandlers,
    ...(uiStateKey !== undefined && { uiStateKey }),
  });

  const [isRunning, setIsRunning] = useState(false);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
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
  // The resume batch currently sitting in the run queue. Referenced so results
  // arriving before it is sent merge into it instead of deadlocking the buffer
  // (queued results are not in `messages` yet, so they still count as pending).
  const pendingResumeRef = useRef<
    (LangChainMessage & { type: "tool" })[] | null
  >(null);
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
  }> | null>(null);
  runQueueRef.current ??= createSerialRunQueue({
    run: ({ messages, config }, onComplete) => {
      if (messages === pendingResumeRef.current) {
        pendingResumeRef.current = null;
      }
      runErrorBalanceRef.current = 0;
      return sendMessageRef.current(messages, config, () => {
        if (runErrorBalanceRef.current > 0) {
          pendingResumeRef.current = null;
          runQueueRef.current!.drop();
        }
        onComplete();
      });
    },
    onRunningChange: setIsRunning,
  });
  const runQueue = runQueueRef.current;

  const handleSendMessage = (
    messages: LangChainMessage[],
    config: LangGraphSendMessageConfig,
  ) => runQueue.enqueue({ messages, config });

  const runUserMessage = async (msg: AppendMessage) => {
    // A new turn abandons any half-collected parallel tool batch and any
    // queued resume; the cancellations below answer the dangling tool calls.
    toolResultBufferRef.current.clear();
    pendingResumeRef.current = null;
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

  const langGraphMessagesRef = useRef(messages);
  langGraphMessagesRef.current = messages;

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

  const queueRef = useRef<MessageQueueController | null>(null);
  if (unstable_enableMessageQueue && !queueRef.current) {
    queueRef.current = createMessageQueue({
      run: (message) => {
        void runUserMessageRef.current(message);
      },
    });
  } else if (!unstable_enableMessageQueue && queueRef.current) {
    queueRef.current.adapter.clear("cancel-run");
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
      // Buffer results until every pending tool call in the turn has one, then
      // resume the graph with the full batch in a single run. Sending each
      // result on its own would resume LangGraph while sibling tool calls of a
      // parallel turn are still executing.
      const queuedResume = pendingResumeRef.current;
      const queuedIds = new Set(queuedResume?.map((m) => m.tool_call_id));
      const batch = bufferToolResult(
        toolResultBufferRef.current,
        getPendingToolCalls(messages).filter((t) => !queuedIds.has(t.id)),
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
      pendingResumeRef.current = batch;
      try {
        // TODO reuse runconfig here!
        await handleSendMessage(batch, {});
      } finally {
        if (pendingResumeRef.current === batch) {
          pendingResumeRef.current = null;
        }
      }
    },
    onEdit: getCheckpointId
      ? async (msg) => {
          toolResultBufferRef.current.clear();
          pendingResumeRef.current = null;
          runQueue.drop();
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
          const externalId = aui.threadListItem().getState().externalId;
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
            pendingResumeRef.current = null;
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
            const externalId = aui.threadListItem().getState().externalId;
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
      ? async () => {
          pendingResumeRef.current = null;
          runQueue.drop();
          cancel();
        }
      : undefined,
  });

  {
    const loadRef = useRef(load);
    useEffect(() => {
      loadRef.current = load;
    });

    useEffect(() => {
      const load = loadRef.current;
      if (!load) return;

      const externalId = aui.threadListItem().getState().externalId;
      if (externalId == null) return;

      // drop stale callbacks and abort the pending load on thread switch/unmount
      const controller = new AbortController();
      toolResultBufferRef.current.clear();
      setIsLoadingThread(true);
      load(externalId, { signal: controller.signal })
        .then(({ messages, interrupts, uiMessages }) => {
          if (controller.signal.aborted) return;
          setMessages(messages);
          setUIMessages(uiMessages ?? []);
          setInterrupt(interrupts?.[0]);
        })
        .catch((error) => {
          if (controller.signal.aborted) return;
          console.warn("useLangGraphRuntime: load handler rejected", error);
        })
        .finally(() => {
          if (controller.signal.aborted) return;
          setIsLoadingThread(false);
        });

      return () => {
        controller.abort();
        setIsLoadingThread(false);
      };
    }, [aui, setMessages, setUIMessages, setInterrupt]);
  }

  return runtime;
};

export const useLangGraphRuntime = ({
  cloud,
  unstable_threadListAdapter,
  create,
  delete: deleteFn,
  onThreadIdChange,
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
        return aui.threadListItem().initialize();
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
  });
};
