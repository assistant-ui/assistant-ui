"use client";

import { useEffect } from "react";
import { useAssistantContext } from "../context/react/AssistantContext";

export const useAssistantInstructions = (instruction: string) => {
  const { useModelConfig } = useAssistantContext();
  const registerModelConfigProvider = useModelConfig(
    (s) => s.registerModelConfigProvider,
  );
  useEffect(() => {
    const config = {
      system: instruction,
    };
    return registerModelConfigProvider({ getModelConfig: () => config });
  }, [registerModelConfigProvider, instruction]);
};
