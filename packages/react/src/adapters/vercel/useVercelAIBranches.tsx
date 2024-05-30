"use client";

import type { Message } from "ai";
import type { UseAssistantHelpers, UseChatHelpers } from "ai/react";
import { useCallback, useMemo, useRef } from "react";
import type {
  AssistantStore,
  CreateThreadMessage,
  ThreadState,
} from "../../utils/context/stores/AssistantTypes";
import { ROOT_PARENT_ID } from "../../utils/context/stores/AssistantTypes";

export const UPCOMING_MESSAGE_ID = "__UPCOMING_MESSAGE_ID__";

type ChatBranchData = {
  parentMap: Map<string, string>; // child_id -> parent_id
  branchMap: Map<string, string[]>; // parent_id -> child_ids
  snapshots: Map<string, Message[]>; // message_id -> message[]
};

const updateBranchData = (data: ChatBranchData, messages: Message[]) => {
  for (let i = 0; i < messages.length; i++) {
    const child = messages[i]!;
    const childId = child.id;

    const parentId = messages[i - 1]?.id ?? ROOT_PARENT_ID;
    data.parentMap.set(childId, parentId);

    const parentArray = data.branchMap.get(parentId);
    if (!parentArray) {
      data.branchMap.set(parentId, [childId]);
    } else if (!parentArray.includes(childId)) {
      parentArray.push(childId);
    }

    data.snapshots.set(childId, messages);
  }
};

const getParentId = (
  data: ChatBranchData,
  messages: Message[],
  messageId: string,
) => {
  if (messageId === UPCOMING_MESSAGE_ID) {
    const parent = messages.at(-1);
    if (!parent) return ROOT_PARENT_ID;
    return parent.id;
  }

  const parentId = data.parentMap.get(messageId);
  if (!parentId) throw new Error("Unexpected: Message parent not found");
  return parentId;
};

const getBranchStateImpl = (
  data: ChatBranchData,
  messages: Message[],
  messageId: string,
) => {
  const parentId = getParentId(data, messages, messageId);

  const branches = data.branchMap.get(parentId) ?? [];
  const branchId =
    messageId === UPCOMING_MESSAGE_ID
      ? branches.length
      : branches.indexOf(messageId);

  if (branchId === -1)
    throw new Error("Unexpected: Message not found in parent children");

  const upcomingOffset = messageId === UPCOMING_MESSAGE_ID ? 1 : 0;

  return {
    branchId,
    branchCount: branches.length + upcomingOffset,
  };
};

const switchToBranchImpl = (
  data: ChatBranchData,
  messages: Message[],
  messageId: string,
  branchId: number,
): Message[] => {
  const parentId = getParentId(data, messages, messageId);

  const branches = data.branchMap.get(parentId);
  if (!branches) throw new Error("Unexpected: Parent children not found");

  const newMessageId = branches[branchId];
  if (!newMessageId) throw new Error("Unexpected: Requested branch not found");

  if (branchId < 0 || branchId >= branches.length)
    throw new Error("Switch to branch called with a branch index out of range");

  // switching to self
  if (newMessageId === messageId) return messages;

  const snapshot = data.snapshots.get(newMessageId);
  if (!snapshot) throw new Error("Unexpected: Branch snapshot not found");

  // return the unstashed messages
  return snapshot;
};

const sliceMessagesUntil = (messages: Message[], messageId: string) => {
  if (messageId === ROOT_PARENT_ID) return [];
  if (messageId === UPCOMING_MESSAGE_ID) return messages;

  const messageIdx = messages.findIndex((m) => m.id === messageId);
  if (messageIdx === -1) throw new Error("Unexpected: Message not found");

  return messages.slice(0, messageIdx + 1);
};

export type BranchState = {
  branchId: number;
  branchCount: number;
};

export type UseBranches = {
  getBranchState: (messageId: string) => BranchState;
  switchToBranch: (messageId: string, branchId: number) => void;
  append: (message: CreateThreadMessage) => Promise<void>;
  reload: (messageId: string) => Promise<void>;
};

export const useVercelAIBranches = (
  chat: UseChatHelpers | UseAssistantHelpers,
  context: AssistantStore,
): UseBranches => {
  const data = useRef<ChatBranchData>({
    parentMap: new Map(),
    branchMap: new Map(),
    snapshots: new Map(),
  }).current;

  updateBranchData(data, chat.messages);

  const getBranchState = useCallback(
    (messageId: string) => {
      return getBranchStateImpl(data, chat.messages, messageId);
    },
    [data, chat.messages],
  );

  const switchToBranch = useCallback(
    (messageId: string, branchId: number) => {
      const newMessages = switchToBranchImpl(
        data,
        chat.messages,
        messageId,
        branchId,
      );
      chat.setMessages(newMessages);
    },
    [data, chat.messages, chat.setMessages],
  );

  const reloadMaybe = "reload" in chat ? chat.reload : undefined;
  const reload = useCallback(
    async (messageId: string) => {
      if (!reloadMaybe)
        throw new Error("Reload not supported by Vercel AI SDK's useAssistant");

      const newMessages = sliceMessagesUntil(chat.messages, messageId);
      chat.setMessages(newMessages);

      context.useThread.getState().scrollToBottom();
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

      context.useThread.getState().scrollToBottom();
      await chat.append({
        role: "user",
        content: message.content[0].text,
      });
    },
    [context, chat.messages, chat.setMessages, chat.append],
  );

  return useMemo(
    () => ({
      getBranchState,
      switchToBranch,
      append,
      reload,
    }),
    [getBranchState, switchToBranch, append, reload],
  );
};
export const hasUpcomingMessage = (thread: ThreadState) => {
  return (
    thread.isLoading &&
    thread.messages[thread.messages.length - 1]?.role !== "assistant"
  );
};
