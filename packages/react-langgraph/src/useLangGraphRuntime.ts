/// <reference types="@assistant-ui/core/store" />
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  LangChainMessage,
  LangChainToolCall,
  LangGraphTupleMetadata,
  OnMessageChunkCallback,
  OnValuesEventCallback,
  OnUpdatesEventCallback,
  OnSubgraphValuesEventCallback,
  OnSubgraphUpdatesEventCallback,
  OnCustomEventCallback,
  OnErrorEventCallback,
  OnSubgraphErrorEventCallback,
  OnInfoEventCallback,
  OnMetadataEventCallback,
  UIMessage,
} from "./types";
import {
  getExternalStoreMessages,
  type ThreadMessage,
  type AttachmentAdapter,
  type AppendMessage,
  type FeedbackAdapter,
  type SpeechSynthesisAdapter,
} from "@assistant-ui/core";
import {
  type ToolExecutionStatus,
  type DataMessagePartComponent,
  useCloudThreadListAdapter,
  useRemoteThreadListRuntime,
  useExternalMessageConverter,
  useExternalStoreRuntime,
  useToolInvocations,
} from "@assistant-ui/core/react";
import { useAui, useAuiState } from "@assistant-ui/store";
import type { AssistantCloud } from "assistant-cloud";
import type { RemoteThreadListAdapter } from "@assistant-ui/core";
import { convertLangChainMessages } from "./convertLangChainMessages";
import {
  type LangGraphCommand,
  type LangGraphInterruptState,
  type LangGraphSendMessageConfig,
  type LangGraphStreamCallback,
  useLangGraphMessages,
} from "./useLangGraphMessages";
import { appendLangChainChunk } from "./appendLangChainChunk";

const getPendingToolCalls = (messages: LangChainMessage[]) => {
  const pendingToolCalls = new Map<string, LangChainToolCall>();
  for (const message of messages) {
    if (message.type === "ai") {
      for (const toolCall of message.tool_calls ?? []) {
        pendingToolCalls.set(toolCall.id, toolCall);
      }
    }
    if (message.type === "tool") {
      pendingToolCalls.delete(message.tool_call_id);
    }
  }

  return [...pendingToolCalls.values()];
};

const getMessageContent = (msg: AppendMessage) => {
  const allContent = [
    ...msg.content,
    ...(msg.attachments?.flatMap((a) => a.content) ?? []),
  ];

  const hasNonText = allContent.some(
    (part) => part.type === "file" || part.type === "image",
  );
  const hasText = allContent.some((part) => part.type === "text");
  if (hasNonText && !hasText) {
    allContent.unshift({ type: "text", text: " " });
  }

  const content = allContent.map((part) => {
    const type = part.type;
    switch (type) {
      case "text":
        return { type: "text" as const, text: part.text };
      case "image":
        return { type: "image_url" as const, image_url: { url: part.image } };
      case "file":
        return {
          type: "file" as const,
          data: part.data,
          mime_type: part.mimeType,
          metadata: {
            filename: part.filename ?? "file",
          },
          source_type: "base64" as const,
        };

      case "tool-call":
        throw new Error("Tool call appends are not supported.");

      default: {
        const _exhaustiveCheck: "reasoning" | "source" | "audio" | "data" =
          type;
        throw new Error(
          `Unsupported append message part type: ${_exhaustiveCheck}`,
        );
      }
    }
  });

  if (content.length === 1 && content[0]?.type === "text") {
    return content[0].text ?? "";
  }

  return content;
};

const symbolLangGraphRuntimeExtras = Symbol("langgraph-runtime-extras");
type LangGraphRuntimeExtras = {
  [symbolLangGraphRuntimeExtras]: true;
  send: (
    messages: LangChainMessage[],
    config: LangGraphSendMessageConfig,
  ) => Promise<void>;
  interrupt: LangGraphInterruptState | undefined;
  messageMetadata: Map<string, LangGraphTupleMetadata>;
  uiMessages: readonly UIMessage[];
};

const asLangGraphRuntimeExtras = (extras: unknown): LangGraphRuntimeExtras => {
  if (
    typeof extras !== "object" ||
    extras == null ||
    !(symbolLangGraphRuntimeExtras in extras)
  )
    throw new Error(
      "This method can only be called when you are using useLangGraphRuntime",
    );

  return extras as LangGraphRuntimeExtras;
};

export const useLangGraphInterruptState = () => {
  const interrupt = useAuiState((s) => {
    const extras = s.thread.extras;
    if (!extras) return undefined;
    return asLangGraphRuntimeExtras(extras).interrupt;
  });
  return interrupt;
};

export const useLangGraphSend = () => {
  const aui = useAui();

  return (messages: LangChainMessage[], config: LangGraphSendMessageConfig) => {
    const extras = aui.thread().getState().extras;
    const { send } = asLangGraphRuntimeExtras(extras);
    return send(messages, config);
  };
};

export const useLangGraphSendCommand = () => {
  const send = useLangGraphSend();
  return (command: LangGraphCommand) => send([], { command });
};

export const useLangGraphMessageMetadata = () => {
  const messageMetadata = useAuiState((s) => {
    const extras = s.thread.extras;
    if (!extras) return new Map<string, LangGraphTupleMetadata>();
    return asLangGraphRuntimeExtras(extras).messageMetadata;
  });
  return messageMetadata;
};

const EMPTY_UI_MESSAGES: readonly UIMessage[] = Object.freeze([]);

export const useLangGraphUIMessages = () => {
  return useAuiState((s) => {
    const extras = s.thread.extras;
    if (!extras) return EMPTY_UI_MESSAGES;
    return asLangGraphRuntimeExtras(extras).uiMessages;
  });
};

export type UseLangGraphRuntimeOptions = {
  autoCancelPendingToolCalls?: boolean | undefined;
  /**
   * When true, renders the Cancel button in the composer and aborts the
   * `AbortController` whose signal is exposed to your `stream` callback
   * as `config.abortSignal`.
   */
  unstable_allowCancellation?: boolean | undefined;
  stream: LangGraphStreamCallback<LangChainMessage>;
  /**
   * State key under which LangGraph's `typed_ui` writes Generative UI
   * messages in the graph state. Must match the `stateKey` option passed to
   * `typedUi(config, { stateKey })` on the server. Defaults to `"ui"`.
   */
  uiStateKey?: string;
  /**
   * Resolves a checkpoint ID for a given thread and message history.
   * When provided, enables message editing (onEdit) and regeneration (onReload).
   * The checkpoint ID is passed to the stream callback for server-side forking.
   */
  getCheckpointId?: (
    threadId: string,
    parentMessages: LangChainMessage[],
  ) => Promise<string | null>;
  /**
   * @deprecated This method has been renamed to `load`. Use `load` instead.
   */
  onSwitchToThread?: (threadId: string) => Promise<{
    messages: LangChainMessage[];
    interrupts?: LangGraphInterruptState[];
    uiMessages?: UIMessage[];
  }>;
  load?: (threadId: string) => Promise<{
    messages: LangChainMessage[];
    interrupts?: LangGraphInterruptState[];
    /**
     * Persisted LangSmith Generative UI messages for this thread, typically
     * read from `state.values[uiStateKey]` returned by the LangGraph SDK's
     * `client.threads.getState()`. Defaults to an empty list.
     */
    uiMessages?: UIMessage[];
  }>;
  create?: () => Promise<{
    externalId: string;
  }>;
  delete?: (threadId: string) => Promise<void>;
  adapters?:
    | {
        attachments?: AttachmentAdapter;
        speech?: SpeechSynthesisAdapter;
        feedback?: FeedbackAdapter;
      }
    | undefined;
  eventHandlers?:
    | {
        /**
         * Called for each message chunk received from messages-tuple streaming,
         * with the chunk and its associated metadata
         */
        onMessageChunk?: OnMessageChunkCallback;
        /**
         * Called when top-level values events are received from the LangGraph stream.
         * Subgraph values are routed to `onSubgraphValues`.
         */
        onValues?: OnValuesEventCallback;
        /**
         * Called when top-level updates events are received from the LangGraph stream.
         * Subgraph updates are routed to `onSubgraphUpdates`.
         */
        onUpdates?: OnUpdatesEventCallback;
        /** Called when a subgraph (namespaced) values event is received. */
        onSubgraphValues?: OnSubgraphValuesEventCallback;
        /** Called when a subgraph (namespaced) updates event is received. */
        onSubgraphUpdates?: OnSubgraphUpdatesEventCallback;
        /**
         * Called when metadata is received from the LangGraph stream
         */
        onMetadata?: OnMetadataEventCallback;
        /**
         * Called when informational messages are received from the LangGraph stream
         */
        onInfo?: OnInfoEventCallback;
        /**
         * Called when errors occur during LangGraph stream processing.
         * Fires for both top-level and subgraph errors; subgraph errors
         * additionally trigger `onSubgraphError` with the namespace.
         */
        onError?: OnErrorEventCallback;
        /** Called when a subgraph (namespaced) error event is received, in addition to `onError`. */
        onSubgraphError?: OnSubgraphErrorEventCallback;
        /**
         * Called when custom events are received from the LangGraph stream
         */
        onCustomEvent?: OnCustomEventCallback;
      }
    | undefined;
  /**
   * Register data renderers for Generative UI components.
   *
   * `renderers` maps a `ui_message` name to a static component.
   * `fallback` handles any name without a static match — use this for
   * dynamic loading (e.g. LangSmith's `LoadExternalComponent`).
   */
  uiComponents?:
    | {
        fallback?: DataMessagePartComponent;
        renderers?: Record<string, DataMessagePartComponent>;
      }
    | undefined;
  cloud?: AssistantCloud | undefined;
  /**
   * A `RemoteThreadListAdapter` to use instead of the cloud adapter. Provide
   * this to back the thread list with a custom store (e.g. LangGraph
   * `client.threads.search()`) so pre-existing LangGraph thread ids appear in
   * the UI and can be switched between without assistant-cloud.
   *
   * When provided, `cloud`, `create`, and `delete` are ignored — the adapter
   * owns the full thread list lifecycle. The `externalId` returned by the
   * adapter's `list()` / `initialize()` is what the `load` callback receives.
   */
  unstable_threadListAdapter?: RemoteThreadListAdapter | undefined;
};

const truncateLangChainMessages = (
  threadMessages: readonly ThreadMessage[],
  parentId: string | null,
): LangChainMessage[] => {
  if (parentId === null) return [];
  const parentIndex = threadMessages.findIndex((m) => m.id === parentId);
  if (parentIndex === -1) return [];
  const truncated: LangChainMessage[] = [];
  for (let i = 0; i <= parentIndex && i < threadMessages.length; i++) {
    truncated.push(
      ...getExternalStoreMessages<LangChainMessage>(threadMessages[i]!),
    );
  }
  return truncated;
};

const filterUIMessagesBySurvivingIds = (
  uiMessages: readonly UIMessage[],
  survivingMessages: readonly LangChainMessage[],
): UIMessage[] => {
  const survivingIds = new Set<string>();
  for (const m of survivingMessages) {
    if (m.id) survivingIds.add(m.id);
  }
  return uiMessages.filter((ui) => {
    const parentId = ui.metadata?.message_id;
    // orphans (no message_id) represent global UI, cleared only via delete_ui_message
    if (!parentId) return true;
    return survivingIds.has(parentId);
  });
};

const useLangGraphRuntimeImpl = ({
  autoCancelPendingToolCalls,
  adapters: { attachments, feedback, speech } = {},
  unstable_allowCancellation,
  stream,
  onSwitchToThread: _onSwitchToThread,
  load = _onSwitchToThread,
  getCheckpointId,
  eventHandlers,
  uiStateKey,
  uiComponents,
}: UseLangGraphRuntimeOptions) => {
  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const aui = useAui();

  // Ref-based reconcile so inline `uiComponents` objects don't re-register
  // every render via `useEffect` dependency identity.
  const uiFallback = uiComponents?.fallback;
  const uiRenderers = uiComponents?.renderers;
  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const registeredRenderersRef = useRef<Map<string, DataMessagePartComponent>>(
    new Map(),
  );
  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const rendererCleanupsRef = useRef<Map<string, () => void>>(new Map());
  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const fallbackRef = useRef<DataMessagePartComponent | undefined>(undefined);
  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const fallbackCleanupRef = useRef<(() => void) | undefined>(undefined);

  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
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

  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
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
    // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  } = useLangGraphMessages({
    appendMessage: appendLangChainChunk,
    stream,
    ...(eventHandlers && { eventHandlers }),
    ...(uiStateKey !== undefined && { uiStateKey }),
  });

  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const [isRunning, setIsRunning] = useState(false);
  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const [toolStatuses, setToolStatuses] = useState<
    Record<string, ToolExecutionStatus>
  >({});
  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const toolArgsKeyOrderCacheRef = useRef<Map<string, Map<string, string[]>>>(
    new Map(),
  );
  const hasExecutingTools = Object.values(toolStatuses).some(
    (s) => s?.type === "executing",
  );
  const effectiveIsRunning = isRunning || hasExecutingTools;

  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
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
  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const converterMetadata = useMemo(
    () =>
      ({
        toolArgsKeyOrderCache: toolArgsKeyOrderCacheRef.current,
        uiMessagesByParent,
      }) as unknown as useExternalMessageConverter.Metadata,
    [uiMessagesByParent],
  );

  const handleSendMessage = (
    messages: LangChainMessage[],
    config: LangGraphSendMessageConfig,
  ) => {
    setIsRunning(true);
    // setIsRunning(false) flips atomically with the final reconcile via onComplete
    return sendMessage(messages, config, () => setIsRunning(false));
  };

  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const threadMessages = useExternalMessageConverter({
    callback: convertLangChainMessages,
    messages,
    isRunning: effectiveIsRunning,
    metadata: converterMetadata,
  });

  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const threadMessagesRef = useRef(threadMessages);
  threadMessagesRef.current = threadMessages;

  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const uiMessagesRef = useRef(uiMessages);
  uiMessagesRef.current = uiMessages;

  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const [runtimeRef] = useState(() => ({
    get current() {
      return runtime;
    },
  }));

  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const toolInvocations = useToolInvocations({
    state: {
      messages: threadMessages,
      isRunning: effectiveIsRunning,
    },
    getTools: () => runtimeRef.current.thread.getModelContext().tools,
    onResult: (command) => {
      if (command.type === "add-tool-result") {
        void handleSendMessage(
          [
            {
              type: "tool",
              name: command.toolName,
              tool_call_id: command.toolCallId,
              content: JSON.stringify(command.result),
              artifact: command.artifact,
              status: command.isError ? "error" : "success",
            },
          ],
          {},
        );
      }
    },
    setToolStatuses,
  });

  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const runtime = useExternalStoreRuntime({
    isRunning: effectiveIsRunning,
    messages: threadMessages,
    adapters: {
      attachments,
      feedback,
      speech,
    },
    extras: {
      [symbolLangGraphRuntimeExtras]: true,
      interrupt,
      messageMetadata,
      uiMessages,
      send: handleSendMessage,
    } satisfies LangGraphRuntimeExtras,
    onNew: async (msg) => {
      await toolInvocations.abort();

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
        [
          ...cancellations,
          {
            type: "human",
            content: getMessageContent(msg),
          },
        ],
        {
          runConfig: msg.runConfig,
        },
      );
    },
    onAddToolResult: async ({
      toolCallId,
      toolName,
      result,
      isError,
      artifact,
    }) => {
      // TODO parallel human in the loop calls
      await handleSendMessage(
        [
          {
            type: "tool",
            name: toolName,
            tool_call_id: toolCallId,
            content: JSON.stringify(result),
            artifact,
            status: isError ? "error" : "success",
          },
        ],
        // TODO reuse runconfig here!
        {},
      );
    },
    onEdit: getCheckpointId
      ? async (msg) => {
          await toolInvocations.abort();
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
          await toolInvocations.abort();
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
          await toolInvocations.abort();
        }
      : undefined,
  });

  {
    // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
    const loadRef = useRef(load);
    // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
    useEffect(() => {
      loadRef.current = load;
    });

    // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
    useEffect(() => {
      const load = loadRef.current;
      if (!load) return;

      const externalId = aui.threadListItem().getState().externalId;
      if (externalId == null) return;

      load(externalId).then(({ messages, interrupts, uiMessages }) => {
        setMessages(messages);
        setUIMessages(uiMessages ?? []);
        setInterrupt(interrupts?.[0]);
      });
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
      // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
      return useLangGraphRuntimeImpl(options);
    },
    adapter,
    allowNesting: true,
  });
};
