"use client";
import { useState } from "react";
import { create } from "zustand";
import {
  type AssistantStore,
  ROOT_PARENT_ID,
  type ThreadState,
} from "../../utils/context/stores/AssistantTypes";
import { makeThreadComposerStore } from "../../utils/context/stores/ComposerStore";
import { makeViewportStore } from "../../utils/context/stores/ViewportStore";

export const useDummyAIAssistantContext = () => {
  const [context] = useState<AssistantStore>(() => {
    const useThread = create<ThreadState>()(() => ({
      messages: [],
      isRunning: false,
      append: async () => {
        throw new Error("Not implemented");
      },
      cancelRun: () => {
        throw new Error("Not implemented");
      },
      switchToBranch: () => {
        throw new Error("Not implemented");
      },
      startRun: async () => {
        throw new Error("Not implemented");
      },
    }));

    const useViewport = makeViewportStore();
    const useComposer = makeThreadComposerStore({
      onSend: (text) => {
        useThread.getState().append({
          parentId: useThread.getState().messages.at(-1)?.id ?? ROOT_PARENT_ID,
          content: [{ type: "text", text }],
        });
      },
      onCancel: () => {
        const thread = useThread.getState();
        if (!thread.isRunning) return false;

        useThread.getState().cancelRun();
        return true;
      },
    });

    return { useThread, useViewport, useComposer };
  });
  return context;
};
