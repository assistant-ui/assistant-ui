"use client";

import type { useChat } from "@ai-sdk/react";
import { useExternalStoreRuntime } from "@assistant-ui/react";
import { sliceMessagesUntil } from "../utils/sliceMessagesUntil";
import { toCreateMessage } from "../utils/toCreateMessage";
import { vercelAttachmentAdapter } from "../utils/vercelAttachmentAdapter";
import { getVercelAIMessages } from "../getVercelAIMessages";
import { ExternalStoreAdapter } from "@assistant-ui/react";
import { AISDKMessageConverter } from "../utils/convertMessage";

export type AISDKRuntimeAdapter = {
  adapters?:
    | Omit<NonNullable<ExternalStoreAdapter["adapters"]>, "attachments">
    | undefined;
};

export const useAISDKRuntime = (
  chatHelpers: ReturnType<typeof useChat>,
  adapter: AISDKRuntimeAdapter = {},
) => {
  const messages = AISDKMessageConverter.useThreadMessages({
    isRunning:
      chatHelpers.status === "submitted" || chatHelpers.status == "streaming",
    messages: chatHelpers.messages,
  });

  const runtime = useExternalStoreRuntime({
    isRunning:
      chatHelpers.status === "submitted" || chatHelpers.status === "streaming",
    messages,
    setMessages: (messages) =>
      chatHelpers.setMessages(messages.map(getVercelAIMessages).flat()),
    onCancel: async () => chatHelpers.stop(),
    onNew: async (message) => {
      await chatHelpers.sendMessage(await toCreateMessage(message));
    },
    onEdit: async (message) => {
      const newMessages = sliceMessagesUntil(
        chatHelpers.messages,
        message.parentId,
      );
      chatHelpers.setMessages(newMessages);

      await chatHelpers.sendMessage(await toCreateMessage(message));
    },
    onReload: async (parentId: string | null) => {
      const newMessages = sliceMessagesUntil(chatHelpers.messages, parentId);
      chatHelpers.setMessages(newMessages);

      await chatHelpers.regenerate();
    },
    onAddToolResult: ({ toolCallId, result }) => {
      chatHelpers.addToolResult({
        tool: toolCallId,
        toolCallId,
        output: result,
      });
    },
    adapters: {
      attachments: vercelAttachmentAdapter,
      ...adapter.adapters,
    },
  });

  return runtime;
};
