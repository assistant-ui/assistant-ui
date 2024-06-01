"use client";

import type { Message } from "ai";
import type { UseAssistantHelpers, UseChatHelpers } from "ai/react";
import { useCallback, useMemo, useState } from "react";
import type {
  AssistantStore,
  CreateThreadMessage,
  ThreadMessage,
  ThreadState,
} from "../../utils/context/stores/AssistantTypes";
import { ROOT_PARENT_ID } from "../../utils/context/stores/AssistantTypes";
import { MessageRepository } from "../MessageRepository";

export const UPCOMING_MESSAGE_ID = "__UPCOMING_MESSAGE_ID__";

export type VercelThreadMessage = ThreadMessage & {
  innerMessage: Message; // TODO make this less hacky
};

const sliceMessagesUntil = (messages: Message[], messageId: string) => {
  if (messageId === ROOT_PARENT_ID) return [];
  if (messageId === UPCOMING_MESSAGE_ID) return messages;

  const messageIdx = messages.findIndex((m) => m.id === messageId);
  if (messageIdx === -1) throw new Error("Unexpected: Message not found");

  return messages.slice(0, messageIdx + 1);
};

export type UseBranches = {
  getBranches: (parentId: string) => string[];
  switchToBranch: (messageId: string) => void;
  append: (message: CreateThreadMessage) => Promise<void>;
  startRun: (parentId: string) => Promise<void>;
};

export const useVercelAIBranches = (
  chat: UseChatHelpers | UseAssistantHelpers,
  messages: ThreadMessage[],
  context: AssistantStore,
): UseBranches => {
  const [data] = useState(() => new MessageRepository());

  useMemo(() => {
    data.resetHead(messages);
  }, [data, messages]);

  const getBranches = useCallback(
    (parentId: string) => {
      return data.getBranches(parentId);
    },
    [data],
  );

  const switchToBranch = useCallback(
    (messageId: string) => {
      data.checkout(messageId);
      chat.setMessages(
        (data.head as VercelThreadMessage[]).map((m) => m.innerMessage),
      );
    },
    [data, chat.setMessages],
  );

  const reloadMaybe = "reload" in chat ? chat.reload : undefined;
  const startRun = useCallback(
    async (parentId: string) => {
      if (!reloadMaybe)
        throw new Error("Reload not supported by Vercel AI SDK's useAssistant");

      const newMessages = sliceMessagesUntil(chat.messages, parentId);
      chat.setMessages(newMessages);

      context.useViewport.getState().scrollToBottom();
      await reloadMaybe();
    },
    [context, chat.messages, chat.setMessages, reloadMaybe],
  );

  const append = useCallback(
    async (message: CreateThreadMessage) => {
      const newMessages = sliceMessagesUntil(chat.messages, message.parentId);
      chat.setMessages(newMessages);

      // TODO image/ui support
      if (message.content.length !== 1 || message.content[0]?.type !== "text")
        throw new Error("Only text content is currently supported");

      context.useViewport.getState().scrollToBottom();
      await chat.append({
        role: "user",
        content: message.content[0].text,
      });
    },
    [context, chat.messages, chat.setMessages, chat.append],
  );

  return useMemo(
    () => ({
      getBranches,
      switchToBranch,
      append,
      startRun,
    }),
    [getBranches, switchToBranch, append, startRun],
  );
};
export const hasUpcomingMessage = (thread: ThreadState) => {
  return (
    thread.isRunning &&
    thread.messages[thread.messages.length - 1]?.role !== "assistant"
  );
};
