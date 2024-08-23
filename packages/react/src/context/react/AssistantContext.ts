"use client";

import { createContext, useContext } from "react";
import type { AssistantModelConfigState } from "../stores/AssistantModelConfig";
import type { AssistantToolUIsState } from "../stores/AssistantToolUIs";
import { ReadonlyStore } from "../ReadonlyStore";
import { AssistantActionsState } from "../stores/AssistantActions";
import { AssistantRuntime } from "../../runtimes";

export type AssistantContextValue = {
  useModelConfig: ReadonlyStore<AssistantModelConfigState>;
  useToolUIs: ReadonlyStore<AssistantToolUIsState>;
  useAssistantRuntime: ReadonlyStore<AssistantRuntime>;
  useAssistantActions: ReadonlyStore<AssistantActionsState>;
};

export const AssistantContext = createContext<AssistantContextValue | null>(
  null,
);

export function useAssistantContext(): AssistantContextValue;
export function useAssistantContext(options: {
  optional: true;
}): AssistantContextValue | null;
export function useAssistantContext(options?: { optional: true }) {
  const context = useContext(AssistantContext);
  if (!options?.optional && !context)
    throw new Error(
      "This component must be used within an AssistantRuntimeProvider.",
    );
  return context;
}
