"use client";

import type { Message } from "ai";
import type { UseAssistantHelpers, UseChatHelpers } from "ai/react";
import { useCallback, useMemo, useState } from "react";
import type {
  AssistantStore,
  CreateThreadMessage,
  ThreadState,
} from "../../utils/context/stores/AssistantTypes";
import { ROOT_PARENT_ID } from "../../utils/context/stores/AssistantTypes";

export const UPCOMING_MESSAGE_ID = "__UPCOMING_MESSAGE_ID__";

type Branch = Message[];

type ChatBranchData = {
  branchMap: Map<string, string[]>; // parent_id -> child_ids
  snapshots: Map<string, Branch>; // message_id -> message[]
};

const updateBranchData = (data: ChatBranchData, messages: Message[]) => {
  for (let i = 0; i < messages.length; i++) {
    const child = messages[i]!;
    const childId = child.id;

    const parentId = messages[i - 1]?.id ?? ROOT_PARENT_ID;
    const parentArray = data.branchMap.get(parentId);
    if (!parentArray) {
      data.branchMap.set(parentId, [childId]);
    } else if (!parentArray.includes(childId)) {
      parentArray.push(childId);
    }

    data.snapshots.set(childId, messages);
  }
};

// TODO handle UPCOMING_MESSAGE_ID
const getChildrenImpl = (data: ChatBranchData, parentId: string) => {
  return data.branchMap.get(parentId) ?? [];
};

const switchToBranchImpl = (
  data: ChatBranchData,
  messageId: string,
): Message[] => {
  const snapshot = data.snapshots.get(messageId);
  if (!snapshot) throw new Error("Unexpected: Branch snapshot not found");
  return snapshot;
};

const sliceMessagesUntil = (messages: Message[], messageId: string) => {
  if (messageId === ROOT_PARENT_ID) return [];
  if (messageId === UPCOMING_MESSAGE_ID) return messages;

  const messageIdx = messages.findIndex((m) => m.id === messageId);
  if (messageIdx === -1) throw new Error("Unexpected: Message not found");

  return messages.slice(0, messageIdx + 1);
};

export type UseBranches = {
  getChildren: (parentId: string) => string[];
  switchToBranch: (messageId: string) => void;
  append: (message: CreateThreadMessage) => Promise<void>;
  startRun: (parentId: string) => Promise<void>;
};

export const useVercelAIBranches = (
  chat: UseChatHelpers | UseAssistantHelpers,
  context: AssistantStore,
): UseBranches => {
  const [data] = useState<ChatBranchData>(() => ({
    branchMap: new Map(),
    snapshots: new Map(),
  }));

  updateBranchData(data, chat.messages);

  const getChildren = useCallback(
    (parentId: string) => {
      return getChildrenImpl(data, parentId);
    },
    [data],
  );

  const switchToBranch = useCallback(
    (messageId: string) => {
      const newMessages = switchToBranchImpl(data, messageId);
      chat.setMessages(newMessages);
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
      getChildren,
      switchToBranch,
      append,
      startRun,
    }),
    [getChildren, switchToBranch, append, startRun],
  );
};
export const hasUpcomingMessage = (thread: ThreadState) => {
  return (
    thread.isRunning &&
    thread.messages[thread.messages.length - 1]?.role !== "assistant"
  );
};
