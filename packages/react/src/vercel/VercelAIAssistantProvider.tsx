"use client";

import type { Message } from "ai";
import type { UseAssistantHelpers, UseChatHelpers } from "ai/react";
import { type FC, type PropsWithChildren, useCallback, useMemo } from "react";
import { AssistantContext } from "../utils/context/AssistantContext";
import type {
  CreateThreadMessage,
  ThreadMessage,
} from "../utils/context/stores/AssistantTypes";
import { useDummyAIAssistantContext } from "./useDummyAIAssistantContext";
import { useVercelAIBranches } from "./useVercelAIBranches";

const ThreadMessageCache = new WeakMap<Message, ThreadMessage>();
const vercelToThreadMessage = (message: Message): ThreadMessage => {
  if (message.role !== "user" && message.role !== "assistant")
    throw new Error("Unsupported role");

  return {
    id: message.id,
    role: message.role,
    content: [{ type: "text", text: message.content }],
  };
};

const vercelToCachedThreadMessages = (messages: Message[]) => {
  return messages.map((m) => {
    const cached = ThreadMessageCache.get(m);
    if (cached) return cached;
    const newMessage = vercelToThreadMessage(m);
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

  const maybeReload = "reload" in vercel ? vercel.reload : null;
  const reload = useCallback(async () => {
    if (!maybeReload) throw new Error("Reload not supported");
    await maybeReload();
  }, [maybeReload]);

  const append = useCallback(
    async (message: CreateThreadMessage) => {
      if (message.content[0]?.type !== "text") {
        throw new Error("Only text content is currently supported");
      }

      context.useThread.getState().scrollToBottom();
      await vercel.append({
        role: message.role,
        content: message.content[0].text,
      });
    },
    [context, vercel.append],
  );

  const stop = useCallback(() => {
    const lastMessage = vercel.messages.at(-1);
    vercel.stop();

    if (lastMessage?.role === "user") {
      vercel.setInput(lastMessage.content);
    }
  }, [vercel.messages, vercel.stop, vercel.setInput]);

  const isLoading =
    "isLoading" in vercel ? vercel.isLoading : vercel.status === "in_progress";
  useMemo(() => {
    context.useThread.setState(
      {
        messages,
        isLoading,
        reload,
        append,
        stop,
      },
      true,
    );
  }, [context, messages, reload, append, stop, isLoading]);

  // -- useComposer sync --

  useMemo(() => {
    context.useComposer.setState({
      canCancel: isLoading,
      value: vercel.input,
      setValue: vercel.setInput,
    });
  }, [context, isLoading, vercel.input, vercel.setInput]);

  // -- useBranchObserver sync --

  const branches = useVercelAIBranches(vercel, context);

  useMemo(() => {
    context.useBranchObserver.setState(branches, true);
  }, [context, branches]);

  return (
    <AssistantContext.Provider value={context}>
      {children}
    </AssistantContext.Provider>
  );
};
