"use client";
import { useState } from "react";
import { create } from "zustand";
import type {
  AssistantStore,
  BranchObserver,
  ThreadState,
} from "../utils/context/AssistantTypes";
import type { ComposerState } from "../utils/context/ComposerTypes";

export const useDummyAIAssistantContext = () => {
  const [context] = useState<AssistantStore>(() => {
    const useThread = create<ThreadState>()(() => ({
      messages: [],
      isLoading: false,
      reload: async () => {
        throw new Error("Not implemented");
      },
      append: async () => {
        throw new Error("Not implemented");
      },
      stop: () => {
        throw new Error("Not implemented");
      },
    }));

    const useComposer = create<ComposerState>()(() => ({
      isEditing: true,
      canCancel: false,
      value: "",
      setValue: (value) => {
        useComposer.setState({ value });
      },
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
        branchCount: 1,
      }),
      switchToBranch: () => {
        throw new Error("Not implemented");
      },
      editAt: async () => {
        throw new Error("Not implemented");
      },
      reloadAt: async () => {
        throw new Error("Not implemented");
      },
    }));

    return { useThread, useComposer, useBranchObserver };
  });
  return context;
};
