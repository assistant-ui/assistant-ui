"use client";
import { useState } from "react";
import { create } from "zustand";
import type {
  AssistantStore,
  ThreadState,
} from "../../utils/context/stores/AssistantTypes";
import { makeThreadComposerStore } from "../../utils/context/stores/ComposerStore";
import { makeViewportStore } from "../../utils/context/stores/ViewportStore";

const makeDummyThreadStore = () => {
  return create<ThreadState>(() => ({
    messages: [],
    isRunning: false,

    getBranches: () => {
      return [];
    },
    switchToBranch: () => {
      throw new Error("Not implemented");
    },

    append: () => {
      throw new Error("Not implemented");
    },
    startRun: () => {
      throw new Error("Not implemented");
    },
    cancelRun: () => {
      throw new Error("Not implemented");
    },
  }));
};

export const useDummyAIAssistantContext = () => {
  const [context] = useState<AssistantStore>(() => {
    const useThread = makeDummyThreadStore();
    const useViewport = makeViewportStore();
    const useComposer = makeThreadComposerStore(useThread);

    return { useThread, useViewport, useComposer };
  });
  return context;
};
