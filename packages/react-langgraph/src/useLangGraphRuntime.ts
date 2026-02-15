import { useEffect, useRef, useState } from "react";
import {
  LangChainMessage,
  LangChainToolCall,
  OnCustomEventCallback,
  OnErrorEventCallback,
  OnInfoEventCallback,
  OnMetadataEventCallback,
} from "./types";
import {
  AssistantCloud,
  INTERNAL,
  type ToolExecutionStatus,
  unstable_useCloudThreadListAdapter,
  unstable_useRemoteThreadListRuntime,
  useAui,
  useAuiState,
  useExternalMessageConverter,
  useExternalStoreRuntime,
} from "@assistant-ui/react";
import { convertLangChainMessages } from "./convertLangChainMessages";
import {
  LangGraphCommand,
  LangGraphInterruptState,
  LangGraphSendMessageConfig,
  LangGraphStreamCallback,
  useLangGraphMessages,
} from "./useLangGraphMessages";
import { AttachmentAdapter } from "@assistant-ui/react";
import { FeedbackAdapter } from "@assistant-ui/react";
import { SpeechSynthesisAdapter } from "@assistant-ui/react";
import { appendLangChainChunk } from "./appendLangChainChunk";
import { getMessageContent } from "./getMessageContent";

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

const symbolLangGraphRuntimeExtras = Symbol("langgraph-runtime-extras");
type LangGraphRuntimeExtras = {
  [symbolLangGraphRuntimeExtras]: true;
  send: (
    messages: LangChainMessage[],
    config: LangGraphSendMessageConfig,
  ) => Promise<void>;
  interrupt: LangGraphInterruptState | undefined;
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

type UseLangGraphRuntimeOptions = {
  autoCancelPendingToolCalls?: boolean | undefined;
  unstable_allowCancellation?: boolean | undefined;
  stream: LangGraphStreamCallback<LangChainMessage>;
  /**
   * @deprecated This method has been renamed to `load`. Use `load` instead.
   */
  onSwitchToThread?: (threadId: string) => Promise<{
    messages: LangChainMessage[];
    interrupts?: LangGraphInterruptState[];
  }>;
  load?: (threadId: string) => Promise<{
    messages: LangChainMessage[];
    interrupts?: LangGraphInterruptState[];
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

const useLangGraphRuntimeImpl = ({
  autoCancelPendingToolCalls,
  adapters: { attachments, feedback, speech } = {},
  unstable_allowCancellation,
  stream,
  onSwitchToThread: _onSwitchToThread,
  load = _onSwitchToThread,
  eventHandlers,
}: UseLangGraphRuntimeOptions) => {
  const {
    interrupt,
    setInterrupt,
    messages,
    sendMessage,
    cancel,
    setMessages,
  } = useLangGraphMessages({
    appendMessage: appendLangChainChunk,
    stream,
    ...(eventHandlers && { eventHandlers }),
  });

  const [isRunning, setIsRunning] = useState(false);
  const [toolStatuses, setToolStatuses] = useState<
    Record<string, ToolExecutionStatus>
  >({});
  const hasExecutingTools = Object.values(toolStatuses).some(
    (s) => s?.type === "executing",
  );
  const effectiveIsRunning = isRunning || hasExecutingTools;

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
  });

  const [runtimeRef] = useState(() => ({
    get current() {
      return runtime;
    },
  }));

  const toolInvocations = INTERNAL.useToolInvocations({
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
    onCancel: unstable_allowCancellation
      ? async () => {
          cancel();
          await toolInvocations.abort();
        }
      : undefined,
  });

  {
    const aui = useAui();

    const loadRef = useRef(load);
    useEffect(() => {
      loadRef.current = load;
    });

    useEffect(() => {
      const load = loadRef.current;
      if (!load) return;

      const externalId = aui.threadListItem().getState().externalId;
      if (externalId == null) return;

      load(externalId).then(({ messages, interrupts }) => {
        setMessages(messages);
        setInterrupt(interrupts?.[0]);
      });
    }, [aui, setMessages, setInterrupt]);
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
  const cloudAdapter = unstable_useCloudThreadListAdapter({
    cloud,
    create: async () => {
      if (create) {
        return create();
      }

      if (aui.threadListItem.source) {
        return aui.threadListItem().initialize();
      }

      throw new Error(
        "initialize function requires you to pass a create function to the useLangGraphRuntime hook",
      );
    },
    delete: deleteFn,
  });
  return unstable_useRemoteThreadListRuntime({
    runtimeHook: function RuntimeHook() {
      return useLangGraphRuntimeImpl(options);
    },
    adapter: cloudAdapter,
    allowNesting: true,
  });
};
