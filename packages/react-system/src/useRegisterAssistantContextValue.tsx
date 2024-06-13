"use client";
import { useEffect } from "react";
import { useAssistantSystemContext } from "./system-context";

export const useRegisterAssistantContextValue = (callback: () => string) => {
  const { useAssistantSystem } = useAssistantSystemContext();
  const addContextProvider = useAssistantSystem(
    (s) => s.addSystemPromptProvider,
  );
  useEffect(() => addContextProvider(callback), [addContextProvider, callback]);
};
