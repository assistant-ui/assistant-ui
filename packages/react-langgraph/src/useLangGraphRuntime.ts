import { useState } from "react";
import { LangChainMessage, LangChainToolCall } from "./types";
import {
  useExternalMessageConverter,
  useExternalStoreRuntime,
} from "@assistant-ui/react";
import { convertLangchainMessages } from "./convertLangchainMessages";
import { useLangGraphMessages } from "./useLangGraphMessages";

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
  stream,
  onSwitchToNewThread,
  onSwitchToThread,
}: {
  threadId?: string | undefined;
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

  return useExternalStoreRuntime({
    threadId,
    isRunning,
    messages: threadMessages,
    onNew: (msg) => {
      if (msg.content.length !== 1 || msg.content[0]?.type !== "text")
        throw new Error("Only text messages are supported");

      const cancellations = getPendingToolCalls(messages).map(
        (t) =>
          ({
            type: "tool",
            name: t.name,
            tool_call_id: t.id,
            content: JSON.stringify({ cancelled: true }),
          }) satisfies LangChainMessage & { type: "tool" },
      );
      return handleSendMessage([
        ...cancellations,
        {
          type: "human",
          content: msg.content[0].text,
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
  });
};
