"use client";

import { createContext, useContext } from "react";

import { AssistantClient } from "../../client/AssistantClient";
import {
  createStoreStateHook,
  createDerivedStateHook,
  createStoreApiHook,
} from "@assistant-ui/react-core";
import type { AssistantToolUIsState } from "../stores/AssistantToolUIs";

export const AssistantContext = createContext<AssistantClient | undefined>(
  undefined,
);

export const useAssistant = createStoreStateHook(AssistantContext);

export const useAssistantStoreApi = createStoreApiHook(AssistantContext);

export const useToolUIs = (selector: (state: AssistantToolUIsState) => any) => {
  const context = useContext(AssistantContext);
  if (!context)
    throw new Error("useToolUIs must be used within AssistantRuntimeProvider");
  return context.actions.toolUI(selector);
};

export const useToolUIsStore = () => {
  const context = useContext(AssistantContext);
  if (!context)
    throw new Error(
      "useToolUIsStore must be used within AssistantRuntimeProvider",
    );
  return context.actions.toolUI;
};

export const useThreadList = createDerivedStateHook(
  useAssistant,
  (state) => state.threads,
);


