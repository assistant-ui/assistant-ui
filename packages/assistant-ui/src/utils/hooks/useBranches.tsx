"use client";

import { useCallback, useMemo, useRef } from "react";
import { UseChatHelpers } from "ai/react";
import { CreateMessage, Message } from "ai";

type ChatBranchData = {
  parentMap: Map<string, string>; // child_id -> parent_id
  branchMap: Map<string, string[]>; // parent_id -> child_ids
  stash: Map<string, Message[]>; // id -> message[]
};

// TODO loop for every message

const ensureLastMessageIsInBranches = (
  data: ChatBranchData,
  messages: Message[],
) => {
  const childId = messages.at(-1)?.id;
  if (!childId) return;

  const parentId = messages.at(-2)?.id ?? "__ROOT_ID__";
  data.parentMap.set(childId, parentId);

  let parentArray = data.branchMap.get(parentId);
  if (!parentArray) {
    data.branchMap.set(parentId, [childId]);
  } else if (!parentArray.includes(childId)) {
    parentArray.push(childId);
  }
};

const getBranchStateImpl = (data: ChatBranchData, message: Message) => {
  const parentId = data.parentMap.get(message.id);
  if (!parentId) throw new Error("Unexpected: Message parent not found");

  const branches = data.branchMap.get(parentId);
  if (!branches) throw new Error("Unexpected: Parent children not found");

  const branchId = branches.indexOf(message.id);
  if (branchId === -1)
    throw new Error("Unexpected: Message not found in parent children");

  return {
    branchId,
    branchCount: branches.length,
  };
};

const switchToBranchImpl = (
  data: ChatBranchData,
  messages: Message[],
  message: Message,
  branchId: number,
): Message[] => {
  const messageIdx = messages.findIndex((m) => m.id === message.id);
  if (messageIdx === -1) throw new Error("Unexpected: Message not found");

  const parentId = data.parentMap.get(message.id);
  if (!parentId) throw new Error("Unexpected: Message parent not found");

  const branches = data.branchMap.get(parentId);
  if (!branches) throw new Error("Unexpected: Parent children not found");

  const newMessageId = branches[branchId];
  if (!newMessageId) throw new Error("Unexpected: Requested branch not found");

  if (branchId < 0 || branchId >= branches.length)
    throw new Error("Switch to branch called with a branch index out of range");

  // switching to self
  if (newMessageId === message.id) return messages;

  const unstashedMessages = data.stash.get(newMessageId);
  if (!unstashedMessages) throw new Error("Unexpected: Branch stash not found");

  // stash the current messages
  const messagesToStash = messages.slice(messageIdx);
  data.stash.set(message.id, messagesToStash);

  // return the unstashed messages
  return messages.slice(0, messageIdx).concat(unstashedMessages);
};

const stachBranchAt = (
  data: ChatBranchData,
  messages: Message[],
  message: Message,
) => {
  const messageIdx = messages.findIndex((m) => m.id === message.id);
  if (messageIdx === -1) throw new Error("Unexpected: Message not found");

  const messagesToStash = messages.slice(messageIdx);
  data.stash.set(message.id, messagesToStash);

  return messageIdx;
};

export type UseChatWithBranchesHelpers = UseChatHelpers & {
  getBranchState: (message: Message) => {
    branchId: number;
    branchCount: number;
  };
  switchToBranch: (message: Message, branchId: number) => void;
  editAt: (message: Message, newMesssage: CreateMessage) => Promise<void>;
  reloadAt: (message: Message) => Promise<void>;
};

export const useChatWithBranches = (
  chat: UseChatHelpers,
): UseChatWithBranchesHelpers => {
  const data = useRef<ChatBranchData>({
    parentMap: new Map(),
    branchMap: new Map(),
    stash: new Map(),
  }).current;

  ensureLastMessageIsInBranches(data, chat.messages);

  const getBranchState = useCallback(
    (message: Message) => {
      if (!message.id) {
        const branchCount =
          data.branchMap.get(chat.messages[chat.messages.length - 1].id)
            ?.length ?? 0;

        return {
          branchId: branchCount,
          branchCount: branchCount + 1,
        };
      }

      return getBranchStateImpl(data, message);
    },
    [chat.messages],
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
    [chat.messages, chat.setMessages],
  );

  const reloadAt = useCallback(
    async (message: Message) => {
      const messages = chat.messages;
      const messageIdx = stachBranchAt(data, messages, message);

      const newMessages = messages.slice(0, messageIdx);
      chat.setMessages(newMessages);
      await chat.reload();
    },
    [chat.messages, chat.setMessages, chat.reload],
  );

  const editAt = useCallback(
    async (message: Message, newMessage: CreateMessage) => {
      const messages = chat.messages;
      const messageIdx = stachBranchAt(data, messages, message);

      const newMessages = messages.slice(0, messageIdx);
      chat.setMessages(newMessages);

      await chat.append(newMessage);
    },
    [chat.messages, chat.append, chat.setMessages],
  );

  return useMemo(
    () => ({
      ...chat,
      getBranchState,
      switchToBranch,
      editAt,
      reloadAt,
    }),
    [chat, getBranchState, switchToBranch, editAt, reloadAt],
  );
};
