"use client";
import { useState } from "react";
import { create } from "zustand";
import {
  type AssistantStore,
  ROOT_PARENT_ID,
  type ThreadState,
} from "../../utils/context/stores/AssistantTypes";
import { makeThreadComposer } from "../../utils/context/stores/ComposerTypes";

export const useDummyAIAssistantContext = () => {
  const [context] = useState<AssistantStore>(() => {
    const scrollToBottomListeners = new Set<() => void>();

    const useThread = create<ThreadState>()(() => ({
      messages: [],
      isLoading: false,
      append: async () => {
        throw new Error("Not implemented");
      },
      stop: () => {
        throw new Error("Not implemented");
      },
      switchToBranch: () => {
        throw new Error("Not implemented");
      },
      reload: async () => {
        throw new Error("Not implemented");
      },
      isAtBottom: true,
      scrollToBottom: () => {
        for (const listener of scrollToBottomListeners) {
          listener();
        }
      },
      onScrollToBottom: (callback) => {
        scrollToBottomListeners.add(callback);
        return () => {
          scrollToBottomListeners.delete(callback);
        };
      },
    }));

    const useComposer = makeThreadComposer({
      onSend: async (text) => {
        await useThread.getState().append({
          parentId: useThread.getState().messages.at(-1)?.id ?? ROOT_PARENT_ID,
          content: [{ type: "text", text }],
        });
      },
      onCancel: () => {
        useThread.getState().stop();
      },
    });

    return { useThread, useComposer };
  });
  return context;
};
