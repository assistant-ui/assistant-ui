import { useEffect, useRef, useState } from "react";
import { LangChainMessage, LangChainToolCall } from "./types";
import {
  useExternalMessageConverter,
  useExternalStoreRuntime,
  useThread,
  useThreadListItemRuntime,
} from "@assistant-ui/react";
import { convertLangchainMessages } from "./convertLangchainMessages";
import {
  LangGraphCommand,
  LangGraphInterruptState,
  LangGraphSendMessageConfig,
  LangGraphStreamCallback,
  useLangGraphMessages,
} from "./useLangGraphMessages";
import { SimpleImageAttachmentAdapter } from "@assistant-ui/react";
import { AttachmentAdapter } from "@assistant-ui/react";
import { AppendMessage } from "@assistant-ui/react";
import { ExternalStoreAdapter } from "@assistant-ui/react";
import { FeedbackAdapter } from "@assistant-ui/react";
import { SpeechSynthesisAdapter } from "@assistant-ui/react";

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
    ...msg.attachments.flatMap((a) => a.content),
  ];
  const content = allContent.map((part) => {
    const type = part.type;
    switch (type) {
      case "text":
        return { type: "text" as const, text: part.text };
      case "image":
        return { type: "image_url" as const, image_url: { url: part.image } };

      case "tool-call":
        throw new Error("Tool call appends are not supported.");

      default:
        const _exhaustiveCheck: "file" | "audio" = type;
        throw new Error(
          `Unsupported append content part type: ${_exhaustiveCheck}`,
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
  const { interrupt } = useThread((t) => asLangGraphRuntimeExtras(t.extras));
  return interrupt;
};

export const useLangGraphSend = () => {
  const { send } = useThread((t) => asLangGraphRuntimeExtras(t.extras));
  return send;
};

export const useLangGraphSendCommand = (command: LangGraphCommand) => {
  const send = useLangGraphSend();
  return () => send([], { command });
};

export const useLangGraphRuntime = ({
  autoCancelPendingToolCalls,
  adapters: { attachments, feedback, speech } = {},
  unstable_allowImageAttachments,
  unstable_allowCancellation,
  stream,
  threadId,
  onSwitchToNewThread,
  onSwitchToThread,
}: {
  /**
   * @deprecated For thread management use `useCloudThreadListRuntime` instead. This option will be removed in a future version.
   */
  threadId?: string | undefined;
  autoCancelPendingToolCalls?: boolean | undefined;
  /**
   * @deprecated Use `adapters: { attachments: new SimpleImageAttachmentAdapter() }` instead. This option will be removed in a future version.
   */
  unstable_allowImageAttachments?: boolean | undefined;
  unstable_allowCancellation?: boolean | undefined;
  stream: LangGraphStreamCallback<LangChainMessage>;
  /**
   * @deprecated For thread management use `useCloudThreadListRuntime` instead. This option will be removed in a future version.
   */
  onSwitchToNewThread?: () => Promise<void> | void;
  onSwitchToThread?: (
    threadId: string,
  ) => Promise<{ messages: LangChainMessage[] }>;
  adapters?:
    | {
        attachments?: AttachmentAdapter;
        speech?: SpeechSynthesisAdapter;
        feedback?: FeedbackAdapter;
      }
    | undefined;
}) => {
  const { interrupt, messages, sendMessage, cancel, setMessages } =
    useLangGraphMessages({
      stream,
    });

  const [isRunning, setIsRunning] = useState(false);
  const handleSendMessage = async (
    messages: LangChainMessage[],
    config: LangGraphSendMessageConfig,
  ) => {
    try {
      setIsRunning(true);
      await sendMessage(messages, config);
    } catch (error) {
      console.error("Error streaming messages:", error);
    } finally {
      setIsRunning(false);
    }
  };

  const threadMessages = useExternalMessageConverter({
    callback: convertLangchainMessages,
    messages,
    isRunning,
  });

  if (attachments && unstable_allowImageAttachments)
    throw new Error(
      "Replace unstable_allowImageAttachments with `adapters: { attachments: new SimpleImageAttachmentAdapter() }`.",
    );
  if (unstable_allowImageAttachments)
    attachments = new SimpleImageAttachmentAdapter();

  const switchToThread = !onSwitchToThread
    ? undefined
    : async (externalId: string) => {
        const { messages } = await onSwitchToThread(externalId);
        setMessages(messages);
      };

  const threadList: NonNullable<
    ExternalStoreAdapter["adapters"]
  >["threadList"] = {
    threadId,
    onSwitchToNewThread: !onSwitchToNewThread
      ? undefined
      : async () => {
          await onSwitchToNewThread();
          setMessages([]);
        },
    onSwitchToThread: switchToThread,
  };

  const loadingRef = useRef(false);
  const threadListItemRuntime = useThreadListItemRuntime({ optional: true });
  useEffect(() => {
    if (!threadListItemRuntime || !switchToThread || loadingRef.current) return;

    const externalId = threadListItemRuntime.getState().externalId;
    if (externalId) {
      loadingRef.current = true;
      switchToThread(externalId).finally(() => {
        loadingRef.current = false;
      });
    }
  }, []);

  return useExternalStoreRuntime({
    isRunning,
    messages: threadMessages,
    adapters: {
      attachments,
      feedback,
      speech,
      threadList,
    },
    extras: {
      [symbolLangGraphRuntimeExtras]: true,
      interrupt,
      send: handleSendMessage,
    } satisfies LangGraphRuntimeExtras,
    onNew: (msg) => {
      const cancellations =
        autoCancelPendingToolCalls !== false
          ? getPendingToolCalls(messages).map(
              (t) =>
                ({
                  type: "tool",
                  name: t.name,
                  tool_call_id: t.id,
                  content: JSON.stringify({ cancelled: true }),
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
    onAddToolResult: async ({ toolCallId, toolName, result }) => {
      // TODO parallel human in the loop calls
      await handleSendMessage(
        [
          {
            type: "tool",
            name: toolName,
            tool_call_id: toolCallId,
            content: JSON.stringify(result),
          },
        ],
        // TODO reuse runconfig here!
        {},
      );
    },
    onCancel: unstable_allowCancellation
      ? async () => {
          cancel();
        }
      : undefined,
  });
};
