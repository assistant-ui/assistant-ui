import { useState } from "react";
import { LangChainMessage, LangChainToolCall } from "./types";
import {
  useExternalMessageConverter,
  useExternalStoreRuntime,
} from "@assistant-ui/react";
import { convertLangchainMessages } from "./convertLangchainMessages";
import { useLangGraphMessages } from "./useLangGraphMessages";
import { SimpleImageAttachmentAdapter } from "@assistant-ui/react";
import { AttachmentAdapter } from "@assistant-ui/react";

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

export const useLangGraphRuntime = ({
  threadId,
  autoCancelPendingToolCalls,
  unstable_allowImageAttachments,
  stream,
  onSwitchToNewThread,
  onSwitchToThread,
  adapters: { attachments },
}: {
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
  onSwitchToNewThread?: () => Promise<void> | void;
  onSwitchToThread?: (
    threadId: string,
  ) => Promise<{ messages: LangChainMessage[] }>;
  adapters: {
    attachments?: AttachmentAdapter;
  };
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

  return useExternalStoreRuntime({
    isRunning,
    messages: threadMessages,
    adapters: {
      attachments,
      threadList: {
        threadId,
        onSwitchToNewThread: !onSwitchToNewThread
          ? undefined
          : async () => {
              await onSwitchToNewThread();
              setMessages([]);
            },
        onSwitchToThread: !onSwitchToThread
          ? undefined
          : async (threadId) => {
              const { messages } = await onSwitchToThread(threadId);
              setMessages(messages);
            },
      },
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

      const allContent = [
        ...msg.content,
        ...msg.attachments.flatMap((a) => a.content),
      ];

      return handleSendMessage([
        ...cancellations,
        {
          type: "human",
          content: allContent.map((part) => {
            const type = part.type;
            switch (type) {
              case "text":
                return { type: "text", text: part.text };
              case "image":
                return { type: "image_url", image_url: { url: part.image } };

              case "audio":
                throw new Error("Audio appends are not supported yet.");
              case "tool-call":
                throw new Error("Tool call appends are not supported yet.");

              default:
                const _exhaustiveCheck: never = type;
                throw new Error(
                  `Unknown content part type: ${_exhaustiveCheck}`,
                );
            }
          }),
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
