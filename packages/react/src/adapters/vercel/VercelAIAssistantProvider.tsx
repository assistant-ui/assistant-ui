"use client";

import type { Message } from "ai";
import type { UseAssistantHelpers, UseChatHelpers } from "ai/react";
import { type FC, type PropsWithChildren, useCallback, useMemo } from "react";
import { AssistantContext } from "../../utils/context/AssistantContext";
import { useDummyAIAssistantContext } from "./useDummyAIAssistantContext";
import {
  type VercelThreadMessage,
  useVercelAIBranches,
} from "./useVercelAIBranches";

const ThreadMessageCache = new WeakMap<Message, VercelThreadMessage>();
const vercelToThreadMessage = (
  message: Message,
  parentId: string | null,
): VercelThreadMessage => {
  if (message.role !== "user" && message.role !== "assistant")
    throw new Error("Unsupported role");

  return {
    parentId,
    id: message.id,
    role: message.role,
    content: [{ type: "text", text: message.content }],
    createdAt: message.createdAt ?? new Date(),
    innerMessage: message,
  };
};

const vercelToCachedThreadMessages = (messages: Message[]) => {
  return messages.map((m, idx) => {
    const cached = ThreadMessageCache.get(m);
    const parentId = messages[idx - 1]?.id ?? null;
    if (cached && cached.parentId === parentId) return cached;

    const newMessage = vercelToThreadMessage(m, parentId);
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

  const messages = useMemo(() => {
    return vercelToCachedThreadMessages(vercel.messages);
  }, [vercel.messages]);

  const branches = useVercelAIBranches(vercel, messages, context);

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
    context.useThread.setState(
      {
        messages: branches.messages,
        isRunning,

        getBranches: branches.getBranches,
        switchToBranch: branches.switchToBranch,

        append: branches.append,
        startRun: branches.startRun,
        cancelRun,
      },
      true,
    );
  }, [context, isRunning, cancelRun, branches]);

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
