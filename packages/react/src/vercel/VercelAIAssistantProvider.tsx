"use client";

import type { Message } from "ai";
import type { UseChatHelpers } from "ai/react";
import { type FC, useCallback, useMemo, useState } from "react";
import { create } from "zustand";
import {
  AssistantContext,
  type AssistantStore,
  type BranchObserver,
  type CreateThreadMessage,
  type ThreadMessage,
  type ThreadState,
} from "../utils/context/AssistantContext";
import type { ComposerState } from "../utils/context/ComposerState";
import { useVercelAIBranches } from "./useVercelAIBranches";

const useAIAssistantContext = () => {
  const [context] = useState<AssistantStore>(() => {
    const useThread = create<ThreadState>()(() => ({
      messages: [],
      isLoading: false,
      reload: async () => {},
      append: async () => {},
      stop: () => {},
    }));

    const useComposer = create<ComposerState>()(() => ({
      isEditing: true,
      canCancel: false,
      value: "",
      setValue: () => {},
      edit: () => {
        throw new Error("Not implemented");
      },
      send: () => {
        useThread.getState().append({
          role: "user",
          content: [{ type: "text", text: useComposer.getState().value }],
        });
        useComposer.getState().setValue("");
      },
      cancel: () => {
        useThread.getState().stop();
      },
    }));

    const useBranchObserver = create<BranchObserver>()(() => ({
      getBranchState: () => ({
        branchId: 0,
        branchCount: 0,
      }),
      switchToBranch: () => {},
      editAt: async () => {},
      reloadAt: async () => {},
    }));

    return { useThread, useComposer, useBranchObserver };
  });
  return context;
};

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

type VercelAIAssistantProviderProps = {
  chat: UseChatHelpers;
  children: React.ReactNode;
};

export const VercelAIAssistantProvider: FC<VercelAIAssistantProviderProps> = ({
  chat,
  children,
}) => {
  const context = useAIAssistantContext();

  // -- useThread sync --

  const messages = useMemo(() => {
    return vercelToCachedThreadMessages(chat.messages);
  }, [chat.messages]);

  const reload = useCallback(async () => {
    await chat.reload();
  }, [chat.reload]);

  const append = useCallback(
    async (message: CreateThreadMessage) => {
      if (message.content[0]?.type !== "text") {
        throw new Error("Only text content is currently supported");
      }

      await chat.append({
        role: message.role,
        content: message.content[0].text,
      });
    },
    [chat.append],
  );

  const stop = useCallback(() => {
    const lastMessage = chat.messages.at(-1);
    chat.stop();

    if (lastMessage?.role === "user") {
      chat.setInput(lastMessage.content);
    }
  }, [chat.messages, chat.stop, chat.setInput]);

  useMemo(() => {
    context.useThread.setState(
      {
        messages,
        isLoading: chat.isLoading,
        reload,
        append,
        stop,
      },
      true,
    );
  }, [context, messages, reload, append, stop, chat.isLoading]);

  // -- useComposer sync --

  useMemo(() => {
    context.useComposer.setState({
      canCancel: chat.isLoading,
      value: chat.input,
      setValue: chat.setInput,
    });
  }, [context, chat.isLoading, chat.input, chat.setInput]);

  // -- useBranchObserver sync --

  const branches = useVercelAIBranches(chat);

  useMemo(() => {
    context.useBranchObserver.setState(branches, true);
  }, [context, branches]);

  return (
    <AssistantContext.Provider value={context}>
      {children}
    </AssistantContext.Provider>
  );
};
