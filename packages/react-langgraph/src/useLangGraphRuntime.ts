/// <reference types="@assistant-ui/core/store" />
import { useEffect, useMemo, useRef, useState } from "react";
import {
  LangChainMessage,
  LangChainToolCall,
  LangGraphTupleMetadata,
  OnMessageChunkCallback,
  OnValuesEventCallback,
  OnUpdatesEventCallback,
  OnCustomEventCallback,
  OnErrorEventCallback,
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
  useCloudThreadListAdapter,
  useRemoteThreadListRuntime,
  useExternalMessageConverter,
  useExternalStoreRuntime,
  useToolInvocations,
} from "@assistant-ui/core/react";
import { useAui, useAuiState } from "@assistant-ui/store";
import { AssistantCloud } from "assistant-cloud";
import { convertLangChainMessages } from "./convertLangChainMessages";
import {
  LangGraphCommand,
  LangGraphInterruptState,
  LangGraphSendMessageConfig,
  LangGraphStreamCallback,
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

      default:
        const _exhaustiveCheck: "reasoning" | "source" | "audio" | "data" =
          type;
        throw new Error(
          `Unsupported append message part type: ${_exhaustiveCheck}`,
        );
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
         * Called when values events are received from the LangGraph stream
         */
        onValues?: OnValuesEventCallback;
        /**
         * Called when updates events are received from the LangGraph stream
         */
        onUpdates?: OnUpdatesEventCallback;
        /**
         * Called when metadata is received from the LangGraph stream
         */
        onMetadata?: OnMetadataEventCallback;
        /**
         * Called when informational messages are received from the LangGraph stream
         */
        onInfo?: OnInfoEventCallback;
        /**
         * Called when errors occur during LangGraph stream processing
         */
        onError?: OnErrorEventCallback;
        /**
         * Called when custom events are received from the LangGraph stream
         */
        onCustomEvent?: OnCustomEventCallback;
      }
    | undefined;
  cloud?: AssistantCloud | undefined;
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
}: UseLangGraphRuntimeOptions) => {
  const aui = useAui();
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
  const [toolStatuses, setToolStatuses] = useState<
    Record<string, ToolExecutionStatus>
  >({});
  const toolArgsKeyOrderCacheRef = useRef<Map<string, Map<string, string[]>>>(
    new Map(),
  );
  const hasExecutingTools = Object.values(toolStatuses).some(
    (s) => s?.type === "executing",
  );
  const effectiveIsRunning = isRunning || hasExecutingTools;

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
      }) as unknown as useExternalMessageConverter.Metadata,
    [uiMessagesByParent],
  );

  const handleSendMessage = async (
    messages: LangChainMessage[],
    config: LangGraphSendMessageConfig,
  ) => {
    try {
      setIsRunning(true);
      await sendMessage(messages, config);
    } finally {
      setIsRunning(false);
    }
  };

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

  const [runtimeRef] = useState(() => ({
    get current() {
      return runtime;
    },
  }));

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
    const loadRef = useRef(load);
    useEffect(() => {
      loadRef.current = load;
    });

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
  return useRemoteThreadListRuntime({
    runtimeHook: function RuntimeHook() {
      return useLangGraphRuntimeImpl(options);
    },
    adapter: cloudAdapter,
    allowNesting: true,
  });
};
