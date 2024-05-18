"use client";

import type { UseChatHelpers } from "ai/react";
import { type FC, useMemo, useState } from "react";
import { create } from "zustand";
import {
  AssistantContext,
  type AssistantStore,
  type BranchObserver,
  type ThreadState,
} from "../utils/context/AssistantContext";
import type { ComposerState } from "../utils/context/ComposerState";
import { useChatWithBranches } from "../utils/hooks/useBranches";

const useAIAssistantContext = () => {
  const [context] = useState<AssistantStore>(() => {
    const useThread = create<ThreadState>()(() => ({
      messages: [],
      setMessages: () => {},
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
          content: useComposer.getState().value,
          role: "user",
          createdAt: new Date(),
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

type VercelAIAssistantProviderProps = {
  chat: UseChatHelpers;
  children: React.ReactNode;
};

export const VercelAIAssistantProvider: FC<VercelAIAssistantProviderProps> = ({
  chat,
  children,
}) => {
  const context = useAIAssistantContext();

  // sync with vercel
  useMemo(() => {
    context.useThread.setState(
      {
        messages: chat.messages,
        setMessages: (value) => {
          chat.setMessages(value);
        },
        isLoading: chat.isLoading,
        reload: async () => {
          await chat.reload();
        },
        append: async (message) => {
          await chat.append(message);
        },
        stop: () => {
          const lastMessage = chat.messages.at(-1);
          chat.stop();

          if (lastMessage?.role === "user") {
            chat.setInput(lastMessage.content);
          }
        },
      },
      true,
    );
  }, [context, chat]);

  // sync with vercel
  useMemo(() => {
    context.useComposer.setState({
      canCancel: chat.isLoading,
      value: chat.input,
      setValue: chat.setInput,
    });
  }, [context, chat.isLoading, chat.input, chat.setInput]);

  const branches = useChatWithBranches(chat);

  // sync with branches
  useMemo(() => {
    context.useBranchObserver.setState(
      {
        getBranchState: (message) => branches.getBranchState(message),
        switchToBranch: (message, branchId) =>
          branches.switchToBranch(message, branchId),
        editAt: async (message, newMessage) =>
          branches.editAt(message, newMessage),
        reloadAt: async (message) => branches.reloadAt(message),
      },
      true,
    );
  }, [context, branches]);

  return (
    <AssistantContext.Provider value={context}>
      {children}
    </AssistantContext.Provider>
  );
};
