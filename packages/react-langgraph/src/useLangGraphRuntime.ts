import { useEffect, useRef, useState } from "react";
import { LangChainMessage, LangChainToolCall } from "./types";
import {
  useExternalMessageConverter,
  useExternalStoreRuntime,
} from "@assistant-ui/react";
import { convertLangchainMessages } from "./convertLangchainMessages";
import { useLangGraphMessages } from "./useLangGraphMessages";
import { SimpleImageAttachmentAdapter } from "@assistant-ui/react";
import { AttachmentAdapter } from "@assistant-ui/react";
import { AppendMessage } from "@assistant-ui/react";
import { ExternalStoreAdapter } from "@assistant-ui/react";
import { useThreadListItemRuntime } from "@assistant-ui/react/context/react/ThreadListItemContext";

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

      case "audio":
        throw new Error("Audio appends are not supported yet.");
      case "tool-call":
        throw new Error("Tool call appends are not supported yet.");

      default:
        const _exhaustiveCheck: never = type;
        throw new Error(`Unknown content part type: ${_exhaustiveCheck}`);
    }
  });

  if (content.length === 1 && content[0]?.type === "text") {
    return content[0].text ?? "";
  }

  return content;
};

export const useLangGraphRuntime = ({
  autoCancelPendingToolCalls,
  adapters: { attachments } = {},
  unstable_allowImageAttachments,
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
  stream: (messages: LangChainMessage[]) => Promise<
    AsyncGenerator<{
      event: string;
      data: any;
    }>
  >;
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
      }
    | undefined;
}) => {
  const { messages, sendMessage, setMessages } = useLangGraphMessages({
    stream,
  });

  const [isRunning, setIsRunning] = useState(false);
  const handleSendMessage = async (messages: LangChainMessage[]) => {
    try {
      setIsRunning(true);
      await sendMessage(messages);
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
    : async (threadId: string) => {
        const { messages } = await onSwitchToThread(threadId);
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
    console.log("switching to thread");
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
      threadList,
    },
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

      return handleSendMessage([
        ...cancellations,
        {
          type: "human",
          content: getMessageContent(msg),
        },
      ]);
    },
    onAddToolResult: async ({ toolCallId, toolName, result }) => {
      await handleSendMessage([
        {
          type: "tool",
          name: toolName,
          tool_call_id: toolCallId,
          content: JSON.stringify(result),
        },
      ]);
    },
  });
};
