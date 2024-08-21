import type { useChat } from "ai/react";
import { useCachedChunkedMessages } from "../utils/useCachedChunkedMessages";
import { convertMessage } from "../utils/convertMessage";
import { useExternalStoreRuntime } from "@assistant-ui/react";
import { useInputSync } from "../utils/useInputSync";
import { sliceMessagesUntil } from "../utils/sliceMessagesUntil";

export const useVercelUseChatRuntime = (
  chatHelpers: ReturnType<typeof useChat>,
) => {
  const messages = useCachedChunkedMessages(chatHelpers.messages);
  const runtime = useExternalStoreRuntime({
    isRunning: chatHelpers.isLoading,
    messages,
    setMessages: (messages) => chatHelpers.setMessages(messages.flat()),
    onCancel: async () => chatHelpers.stop(),
    onNew: async (message) => {
      if (message.content.length !== 1 || message.content[0]?.type !== "text")
        throw new Error(
          "Only text content is supported by VercelUseChatRuntime. Use the Edge runtime for image support.",
        );
      await chatHelpers.append({
        role: message.role,
        content: message.content[0].text,
      });
    },
    onEdit: async (message) => {
      if (message.content.length !== 1 || message.content[0]?.type !== "text")
        throw new Error(
          "Only text content is supported by VercelUseChatRuntime. Use the Edge runtime for image support.",
        );

      const newMessages = sliceMessagesUntil(
        chatHelpers.messages,
        message.parentId,
      );
      chatHelpers.setMessages(newMessages);

      await chatHelpers.append({
        role: message.role,
        content: message.content[0].text,
      });
    },
    onReload: async (parentId: string | null) => {
      const newMessages = sliceMessagesUntil(chatHelpers.messages, parentId);
      chatHelpers.setMessages(newMessages);

      await chatHelpers.reload();
    },
    onAddToolResult: ({ toolCallId, result }) => {
      chatHelpers.addToolResult({ toolCallId, result });
    },
    // onCopy // TODO
    onNewThread: () => {
      chatHelpers.messages = [];
      chatHelpers.input = "";
      chatHelpers.setMessages([]);
      chatHelpers.setInput("");
    },
    convertMessage,
  });

  useInputSync(chatHelpers, runtime);

  return runtime;
};
