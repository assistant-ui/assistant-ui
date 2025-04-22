"use client";

import type { useChat } from "@ai-sdk/react";
import { useExternalStoreRuntime } from "@assistant-ui/react";
import { useInputSync } from "../utils/useInputSync";
import { sliceMessagesUntil } from "../utils/sliceMessagesUntil";
import { toCreateMessage } from "../utils/toCreateMessage";
import { vercelAttachmentAdapter } from "../utils/vercelAttachmentAdapter";
import { getVercelAIMessages } from "../getVercelAIMessages";
import { ExternalStoreAdapter } from "@assistant-ui/react";
import { useState } from "react";
import { generateId } from "@ai-sdk/ui-utils";
import { AISDKMessageConverter } from "../utils/convertMessage";

export type VercelUseChatAdapter = {
  adapters?:
    | Omit<NonNullable<ExternalStoreAdapter["adapters"]>, "attachments">
    | undefined;
  unstable_joinStrategy?: "concat-content" | "none";
};

export const useVercelUseChatRuntime = (
  chatHelpers: ReturnType<typeof useChat>,
  adapter: VercelUseChatAdapter = {},
) => {
  const messages = AISDKMessageConverter.useThreadMessages({
    isRunning:
      chatHelpers.status === "submitted" || chatHelpers.status == "streaming",
    messages: chatHelpers.messages,
    joinStrategy: adapter.unstable_joinStrategy,
  });

  const [threadId, setThreadId] = useState<string>(generateId());

  const runtime = useExternalStoreRuntime({
    isRunning: chatHelpers.isLoading,
    messages,
    setMessages: (messages) =>
      chatHelpers.setMessages(messages.map(getVercelAIMessages).flat()),
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
    adapters: {
      attachments: vercelAttachmentAdapter,
      ...adapter.adapters,
      threadList: new Proxy(adapter.adapters?.threadList ?? {}, {
        get(target, prop, receiver) {
          if (prop === "threadId") {
            return target.threadId ?? threadId;
          }
          if (prop === "onSwitchToNewThread") {
            return () => {
              chatHelpers.messages = [];
              chatHelpers.input = "";
              chatHelpers.setMessages([]);
              chatHelpers.setInput("");
              setThreadId(generateId());

              if (typeof target.onSwitchToNewThread === "function") {
                return target.onSwitchToNewThread.call(target);
              }
            };
          }

          return Reflect.get(target, prop, receiver);
        },
      }),
    },
  });

  useInputSync(chatHelpers, runtime);

  return runtime;
};
