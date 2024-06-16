"use client";

import { useEffect } from "react";
import { useAssistantContext } from "../context/AssistantContext";

export const useAssistantInstructions = (instruction: string) => {
  const { useModelConfig } = useAssistantContext();
  const addContextProvider = useModelConfig(
    (s) => s.registerModelConfigProvider,
  );
  useEffect(
    () =>
      addContextProvider(() => {
        return {
          system: instruction,
        };
      }),
    [addContextProvider, instruction],
  );
};
