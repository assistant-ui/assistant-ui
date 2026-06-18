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
import { langGraphExtras } from "./runtimeExtras";
import {
  filterUIMessagesBySurvivingIds,
  getPendingToolCalls,
  truncateLangChainMessages,
} from "./messageHelpers";

const EMPTY_QUEUE_ITEMS: readonly QueueItemState[] = Object.freeze([]);
const subscribeNoop = () => () => {};

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
    ...(eventHandlers && { eventHandlers }),
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
      }) as unknown as useExternalMessageConverter.Metadata,
    [uiMessagesByParent, messageTiming],
  );

  const handleSendMessage = (
    messages: LangChainMessage[],
    config: LangGraphSendMessageConfig,
  ) => {
    setIsRunning(true);
    // setIsRunning(false) flips atomically with the final reconcile via onComplete
    return sendMessage(messages, config, () => setIsRunning(false));
  };

  const runUserMessage = async (msg: AppendMessage) => {
    // A new turn abandons any half-collected parallel tool batch.
    toolResultBufferRef.current.clear();
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

    return handleSendMessage(
      [...cancellations, { type: "human", content: getMessageContent(msg) }],
      { runConfig: msg.runConfig },
    );
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
    onNew: runUserMessage,
    ...(queueController && { queue: queueController.adapter }),
    onAddToolResult: async ({
      toolCallId,
      toolName,
      result,
      isError,
      artifact,
    }) => {
      // Buffer results until every pending tool call in the turn has one, then
      // resume the graph with the full batch in a single run. Sending each
      // result on its own would resume LangGraph while sibling tool calls of a
      // parallel turn are still executing.
      const batch = bufferToolResult(
        toolResultBufferRef.current,
        getPendingToolCalls(messages),
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
      // TODO reuse runconfig here!
      await handleSendMessage(batch, {});
    },
    onEdit: getCheckpointId
      ? async (msg) => {
          toolResultBufferRef.current.clear();
          const truncated = truncateLangChainMessages(
            threadMessagesRef.current,
            msg.parentId,
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
          return handleSendMessage(
            [{ type: "human", content: getMessageContent(msg) }],
            {
              runConfig: msg.runConfig,
              ...(checkpointId && { checkpointId }),
            },
          );
        }
      : undefined,
    onReload: getCheckpointId
      ? async (parentId, config) => {
          toolResultBufferRef.current.clear();
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
        }
      : undefined,
    onCancel: unstable_allowCancellation
      ? async () => {
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
  });
};
