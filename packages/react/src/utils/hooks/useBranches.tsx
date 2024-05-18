"use client";

import type { CreateMessage, Message } from "ai";
import type { UseChatHelpers } from "ai/react";
import { useCallback, useMemo, useRef } from "react";
import type { ThreadState } from "../context/AssistantContext";

const ROOT_ID = "__ROOT_ID__";
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

    const parentId = messages[i - 1]?.id ?? ROOT_ID;
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
  message: Message,
) => {
  if (message.id === UPCOMING_MESSAGE_ID) {
    const parent = messages.at(-1);
    if (!parent) return ROOT_ID;
    return parent.id;
  }

  const parentId = data.parentMap.get(message.id);
  if (!parentId) throw new Error("Unexpected: Message parent not found");
  return parentId;
};

const getBranchStateImpl = (
  data: ChatBranchData,
  messages: Message[],
  message: Message,
) => {
  const parentId = getParentId(data, messages, message);

  const branches = data.branchMap.get(parentId) ?? [];
  const branchId =
    message.id === UPCOMING_MESSAGE_ID
      ? branches.length
      : branches.indexOf(message.id);

  if (branchId === -1)
    throw new Error("Unexpected: Message not found in parent children");

  const upcomingOffset = message.id === UPCOMING_MESSAGE_ID ? 1 : 0;

  return {
    branchId,
    branchCount: branches.length + upcomingOffset,
  };
};

const switchToBranchImpl = (
  data: ChatBranchData,
  messages: Message[],
  message: Message,
  branchId: number,
): Message[] => {
  const parentId = getParentId(data, messages, message);

  const branches = data.branchMap.get(parentId);
  if (!branches) throw new Error("Unexpected: Parent children not found");

  const newMessageId = branches[branchId];
  if (!newMessageId) throw new Error("Unexpected: Requested branch not found");

  if (branchId < 0 || branchId >= branches.length)
    throw new Error("Switch to branch called with a branch index out of range");

  // switching to self
  if (newMessageId === message.id) return messages;

  const snapshot = data.snapshots.get(newMessageId);
  if (!snapshot) throw new Error("Unexpected: Branch snapshot not found");

  // return the unstashed messages
  return snapshot;
};

const sliceMessagesUntil = (messages: Message[], message: Message) => {
  if (message.id === UPCOMING_MESSAGE_ID) return messages;

  const messageIdx = messages.findIndex((m) => m.id === message.id);
  if (messageIdx === -1) throw new Error("Unexpected: Message not found");

  return messages.slice(0, messageIdx);
};

export type BranchState = {
  branchId: number;
  branchCount: number;
};

export type UseBranches = {
  getBranchState: (message: Message) => BranchState;
  switchToBranch: (message: Message, branchId: number) => void;
  editAt: (message: Message, newMesssage: CreateMessage) => Promise<void>;
  reloadAt: (message: Message) => Promise<void>;
};

export const useChatWithBranches = (chat: UseChatHelpers): UseBranches => {
  const data = useRef<ChatBranchData>({
    parentMap: new Map(),
    branchMap: new Map(),
    snapshots: new Map(),
  }).current;

  updateBranchData(data, chat.messages);

  const getBranchState = useCallback(
    (message: Message) => {
      return getBranchStateImpl(data, chat.messages, message);
    },
    [data, chat.messages],
  );

  const switchToBranch = useCallback(
    (message: Message, branchId: number) => {
      const newMessages = switchToBranchImpl(
        data,
        chat.messages,
        message,
        branchId,
      );
      chat.setMessages(newMessages);
    },
    [data, chat.messages, chat.setMessages],
  );

  const reloadAt = useCallback(
    async (message: Message) => {
      const newMessages = sliceMessagesUntil(chat.messages, message);
      chat.setMessages(newMessages);

      await chat.reload();
    },
    [chat.messages, chat.setMessages, chat.reload],
  );

  const editAt = useCallback(
    async (message: Message, newMessage: CreateMessage) => {
      const newMessages = sliceMessagesUntil(chat.messages, message);
      chat.setMessages(newMessages);

      await chat.append(newMessage);
    },
    [chat.messages, chat.setMessages, chat.append],
  );

  return useMemo(
    () => ({
      getBranchState,
      switchToBranch,
      editAt,
      reloadAt,
    }),
    [getBranchState, switchToBranch, editAt, reloadAt],
  );
};
export const hasUpcomingMessage = (thread: ThreadState) => {
  return (
    thread.isLoading &&
    thread.messages[thread.messages.length - 1]?.role !== "assistant"
  );
};
