"use client";

import type { Message } from "ai";
import type { UseAssistantHelpers, UseChatHelpers } from "ai/react";
import { type FC, type PropsWithChildren, useCallback, useMemo } from "react";
import { AssistantContext } from "../../utils/context/AssistantContext";
import {
  ROOT_PARENT_ID,
  type ThreadMessage,
} from "../../utils/context/stores/AssistantTypes";
import { useDummyAIAssistantContext } from "./useDummyAIAssistantContext";
import { useVercelAIBranches } from "./useVercelAIBranches";

const ThreadMessageCache = new WeakMap<Message, ThreadMessage>();
const vercelToThreadMessage = (
  message: Message,
  parentId: string,
  branches: string[],
): ThreadMessage => {
  if (message.role !== "user" && message.role !== "assistant")
    throw new Error("Unsupported role");

  return {
    parentId: parentId,
    id: message.id,
    role: message.role,
    content: [{ type: "text", text: message.content }],
    branches,
    createdAt: message.createdAt ?? new Date(),
  };
};

const vercelToCachedThreadMessages = (
  messages: Message[],
  getChildren: (messageId: string) => string[],
) => {
  return messages.map((m, idx) => {
    const cached = ThreadMessageCache.get(m);
    const parentId = messages[idx - 1]?.id ?? ROOT_PARENT_ID;
    const branches = getChildren(parentId);
    if (cached && cached.parentId === parentId && cached.branches === branches)
      return cached;

    const newMessage = vercelToThreadMessage(m, parentId, branches);
    ThreadMessageCache.set(m, newMessage);
    return newMessage;
  });
};

type VercelAIAssistantProviderProps = PropsWithChildren<
  | {
      chat: UseChatHelpers;
    }
  | {
      assistant: UseAssistantHelpers;
    }
>;

export const VercelAIAssistantProvider: FC<VercelAIAssistantProviderProps> = ({
  children,
  ...rest
}) => {
  const context = useDummyAIAssistantContext();

  const vercel = "chat" in rest ? rest.chat : rest.assistant;

  // -- useThread sync --
  const branches = useVercelAIBranches(vercel, context);

  const messages = useMemo(() => {
    return vercelToCachedThreadMessages(vercel.messages, branches.getChildren);
  }, [vercel.messages, branches.getChildren]);

  const cancelRun = useCallback(() => {
    const lastMessage = vercel.messages.at(-1);
    vercel.stop();

    if (lastMessage?.role === "user") {
      vercel.setInput(lastMessage.content);
    }
  }, [vercel.messages, vercel.stop, vercel.setInput]);

  const isRunning =
    "isLoading" in vercel ? vercel.isLoading : vercel.status === "in_progress";

  useMemo(() => {
    context.useThread.setState({
      messages,
      isRunning,
      cancelRun,
      switchToBranch: branches.switchToBranch,
      append: branches.append,
      startRun: branches.startRun,
    });
  }, [context, messages, isRunning, cancelRun, branches]);

  // -- useComposer sync --

  useMemo(() => {
    context.useComposer.setState({
      value: vercel.input,
      setValue: vercel.setInput,
    });
  }, [context, vercel.input, vercel.setInput]);

  return (
    <AssistantContext.Provider value={context}>
      {children}
    </AssistantContext.Provider>
  );
};
