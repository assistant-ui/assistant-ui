"use client";

import type { useChat } from "@ai-sdk/react";
import {
  useExternalStoreRuntime,
  ExternalStoreAdapter,
  ThreadHistoryAdapter,
  AssistantRuntime,
} from "@assistant-ui/react";
import { sliceMessagesUntil } from "../utils/sliceMessagesUntil";
import { toCreateMessage } from "../utils/toCreateMessage";
import { vercelAttachmentAdapter } from "../utils/vercelAttachmentAdapter";
import { getVercelAIMessages } from "../getVercelAIMessages";
import { AISDKMessageConverter } from "../utils/convertMessage";
import { aiSDKV5FormatAdapter } from "../adapters/aiSDKFormatAdapter";
import { useExternalHistory } from "./useExternalHistory";
import { useMemo } from "react";

export type AISDKRuntimeAdapter = {
  adapters?:
    | (NonNullable<ExternalStoreAdapter["adapters"]> & {
        history?: ThreadHistoryAdapter | undefined;
      })
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

  const isLoading = useExternalHistory(
    useMemo(
      () => ({
        get current(): AssistantRuntime {
          return runtime;
        },
      }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [],
    ),
    adapter.adapters?.history,
    AISDKMessageConverter.toThreadMessages,
    aiSDKV5FormatAdapter,
    (messages) => {
      chatHelpers.setMessages(messages);
    },
  );

  const runtime = useExternalStoreRuntime({
    isRunning:
      chatHelpers.status === "submitted" || chatHelpers.status === "streaming",
    messages,
    setMessages: (messages) =>
      chatHelpers.setMessages(messages.map(getVercelAIMessages).flat()),
    onCancel: async () => chatHelpers.stop(),
    onNew: async (message) => {
      const createMessage = await toCreateMessage(message);
      await chatHelpers.sendMessage(createMessage);
    },
    onEdit: async (message) => {
      const newMessages = sliceMessagesUntil(
        chatHelpers.messages,
        message.parentId,
      );
      chatHelpers.setMessages(newMessages);

      const createMessage = await toCreateMessage(message);
      await chatHelpers.sendMessage(createMessage);
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
    isLoading,
  });

  return runtime;
};
