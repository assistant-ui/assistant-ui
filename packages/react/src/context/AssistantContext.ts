import { createContext, useContext } from "react";
import type { StoreApi, UseBoundStore } from "zustand";
import type { AssistantModelConfigState } from "./stores/AssistantModelConfig";
import type { AssistantToolRenderersState } from "./stores/AssistantToolRenderers";

export type AssistantContextValue = {
  useModelConfig: UseBoundStore<StoreApi<AssistantModelConfigState>>;
  useToolRenderers: UseBoundStore<StoreApi<AssistantToolRenderersState>>;
};

export const AssistantContext = createContext<AssistantContextValue | null>(
  null,
);

export const useAssistantContext = (): AssistantContextValue => {
  const context = useContext(AssistantContext);
  if (!context)
    throw new Error(
      "This component must be used within an AssistantRuntimeProvider.",
    );
  return context;
};
