"use client";

import { createContext, useContext, useState } from "react";
import { create } from "zustand";
import type { Tool } from "./useRegisterAssistantTool";

type AssistantSystemContextValue = {
  useAssistantSystem: ReturnType<typeof makeAssistantSystemStore>;
};

const AssistantSystemContext =
  createContext<AssistantSystemContextValue | null>(null);

type AssistantSystemStore = {
  getSystemPrompt: () => string;
  addSystemPromptProvider: (provider: () => string) => () => void;

  getTools: () => Record<string, Tool>;
  addTool: (name: string, tool: Tool) => () => void;
};

const makeAssistantSystemStore = () =>
  create<AssistantSystemStore>(() => {
    const contextProviders = new Set<() => string>();
    const tools = new Map<string, Tool>();

    return {
      getSystemPrompt: () => {
        return [...contextProviders].map((p) => p()).join("\n\n");
      },
      addSystemPromptProvider: (provider: () => string) => {
        contextProviders.add(provider);

        return () => {
          contextProviders.delete(provider);
        };
      },

      getTools: () => Object.fromEntries(tools.entries()),
      addTool: (name: string, tool: Tool) => {
        if (tools.has(name)) throw new Error(`Tool ${name} already exists`);
        tools.set(name, tool);

        return () => {
          tools.delete(name);
        };
      },
    } satisfies AssistantSystemStore;
  });

export const AssistantSystemProvider = ({
  children,
}: { children: React.ReactNode }) => {
  const [context] = useState<AssistantSystemContextValue>(() => {
    return {
      useAssistantSystem: makeAssistantSystemStore(),
    };
  });

  return (
    <AssistantSystemContext.Provider value={context}>
      {children}
    </AssistantSystemContext.Provider>
  );
};

export const useAssistantSystemContext = () => {
  const context = useContext(AssistantSystemContext);
  if (!context)
    throw new Error(
      "This component can only be used inside a component passed to <AssistantSystemProvider>.",
    );
  return context;
};
