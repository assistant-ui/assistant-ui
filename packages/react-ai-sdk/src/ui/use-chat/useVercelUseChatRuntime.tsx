import type { useChat } from "ai/react";
import { useCachedChunkedMessages } from "../utils/useCachedChunkedMessages";
import { convertMessage } from "../utils/convertMessage";
import { useExternalStoreRuntime } from "@assistant-ui/react";
import { useInputSync } from "../utils/useInputSync";
import { sliceMessagesUntil } from "../utils/sliceMessagesUntil";
import { toCreateMessage } from "../utils/toCreateMessage";

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
      await chatHelpers.append(await toCreateMessage(message));
    },
    onEdit: async (message) => {
      const newMessages = sliceMessagesUntil(
        chatHelpers.messages,
        message.parentId,
      );
      chatHelpers.setMessages(newMessages);

      await chatHelpers.append(await toCreateMessage(message));
    },
    onReload: async (parentId: string | null) => {
      const newMessages = sliceMessagesUntil(chatHelpers.messages, parentId);
      chatHelpers.setMessages(newMessages);

      await chatHelpers.reload();
    },
    onAddToolResult: ({ toolCallId, result }) => {
      chatHelpers.addToolResult({ toolCallId, result });
    },
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
