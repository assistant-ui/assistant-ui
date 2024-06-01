"use client";

import type { Message } from "ai";
import type { UseAssistantHelpers, UseChatHelpers } from "ai/react";
import { useCallback, useMemo, useRef, useState } from "react";
import type {
  CreateThreadMessage,
  ThreadMessage,
} from "../../utils/context/stores/AssistantTypes";
import { MessageRepository, isOptimisticId } from "../MessageRepository";

export type VercelThreadMessage = ThreadMessage & {
  innerMessage: Message; // TODO make this less hacky
};

const sliceMessagesUntil = (messages: Message[], messageId: string | null) => {
  if (messageId == null) return [];
  if (isOptimisticId(messageId)) return messages; // TODO figure out if this is needed

  const messageIdx = messages.findIndex((m) => m.id === messageId);
  if (messageIdx === -1) throw new Error("Unexpected: Message not found");

  return messages.slice(0, messageIdx + 1);
};

const hasUpcomingMessage = (isRunning: boolean, messages: ThreadMessage[]) => {
  return isRunning && messages[messages.length - 1]?.role !== "assistant";
};

export type UseBranches = {
  messages: ThreadMessage[];
  getBranches: (messageId: string) => string[];
  switchToBranch: (messageId: string) => void;
  append: (message: CreateThreadMessage) => Promise<void>;
  startRun: (parentId: string | null) => Promise<void>;
};

export const useVercelAIBranches = (
  chat: UseChatHelpers | UseAssistantHelpers,
  messages: ThreadMessage[],
): UseBranches => {
  const [data] = useState(() => new MessageRepository());

  const isRunning =
    "isLoading" in chat ? chat.isLoading : chat.status === "in_progress";

  const assistantOptimisticIdRef = useRef<string | null>(null);
  const messagesEx = useMemo(() => {
    for (const message of messages) {
      data.addOrUpdateMessage(message);
    }

    if (assistantOptimisticIdRef.current) {
      data.deleteMessage(assistantOptimisticIdRef.current);
      assistantOptimisticIdRef.current = null;
    }

    if (hasUpcomingMessage(isRunning, messages)) {
      assistantOptimisticIdRef.current = data.commitOptimisticRun(
        messages.at(-1)?.id ?? null,
      );
    }

    data.resetHead(
      assistantOptimisticIdRef.current ?? messages.at(-1)?.id ?? null,
    );

    return data.getMessages();
  }, [data, isRunning, messages]);

  const getBranches = useCallback(
    (messageId: string) => {
      return data.getBranches(messageId);
    },
    [data],
  );

  const switchToBranch = useCallback(
    (messageId: string) => {
      data.switchToBranch(messageId);

      chat.setMessages(
        (data.getMessages() as VercelThreadMessage[])
          .filter((m) => !isOptimisticId(m.id))
          .map((m) => m.innerMessage),
      );
    },
    [data, chat.setMessages],
  );

  const reloadMaybe = "reload" in chat ? chat.reload : undefined;
  const startRun = useCallback(
    async (parentId: string | null) => {
      if (!reloadMaybe)
        throw new Error("Reload not supported by Vercel AI SDK's useAssistant");

      const newMessages = sliceMessagesUntil(chat.messages, parentId);
      chat.setMessages(newMessages);

      await reloadMaybe();
    },
    [chat.messages, chat.setMessages, reloadMaybe],
  );

  const append = useCallback(
    async (message: CreateThreadMessage) => {
      if (message.content.length !== 1 || message.content[0]?.type !== "text")
        throw new Error("Only text content is supported by Vercel AI SDK");

      const newMessages = sliceMessagesUntil(chat.messages, message.parentId);
      chat.setMessages(newMessages);

      await chat.append({
        role: "user",
        content: message.content[0].text,
      });
    },
    [chat.messages, chat.setMessages, chat.append],
  );

  return useMemo(
    () => ({
      messages: messagesEx,
      getBranches,
      switchToBranch,
      append,
      startRun,
    }),
    [messagesEx, getBranches, switchToBranch, append, startRun],
  );
};
