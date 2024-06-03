import { createContext, useContext } from "react";
import type { AssistantStore } from "./stores/AssistantTypes";

export const AssistantContext = createContext<AssistantStore | null>(null);

export const useAssistantContext = () => {
  const context = useContext(AssistantContext);
  if (!context)
    throw new Error(
      "This component must be used within a AssistantProvider",
    );
  return context;
};
