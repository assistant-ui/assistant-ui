import { useState } from "react";
import { LangChainMessage } from "./types";
import {
  useExternalMessageConverter,
  useExternalStoreRuntime,
} from "@assistant-ui/react";
import { convertLangchainMessages } from "./convertLangchainMessages";
import { useLangGraphMessages } from "./useLangGraphMessages";
import { ExternalStoreRuntime } from "@assistant-ui/react";

export const useLangChainLangGraphRuntime = ({
  threadId,
  stream,
}: {
  threadId?: string | undefined;
  stream: (message: LangChainMessage) => Promise<
    AsyncGenerator<{
      event: string;
      data: any;
    }>
  >;
}): ExternalStoreRuntime => {
  const { messages, sendMessage } = useLangGraphMessages({
    stream,
  });

  const [isRunning, setIsRunning] = useState(false);
  const handleSendMessage = async (message: LangChainMessage) => {
    try {
      setIsRunning(true);
      await sendMessage(message);
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

  return useExternalStoreRuntime({
    threadId,
    isRunning,
    messages: threadMessages,
    onNew: (msg) => {
      if (msg.content.length !== 1 || msg.content[0]?.type !== "text")
        throw new Error("Only text messages are supported");
      return handleSendMessage({
        type: "human",
        content: msg.content[0].text,
      });
    },
    onAddToolResult: async ({ toolCallId, toolName, result }) => {
      await handleSendMessage({
        type: "tool",
        name: toolName,
        tool_call_id: toolCallId,
        content: JSON.stringify(result),
      });
    },
  });
};
