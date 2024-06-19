"use client";

import { useEffect } from "react";
import { useAssistantContext } from "../context/AssistantContext";

export const useAssistantInstructions = (instruction: string) => {
  const { useModelConfig } = useAssistantContext();
  const registerModelConfigProvider = useModelConfig(
    (s) => s.registerModelConfigProvider,
  );
  useEffect(() => {
    const config = {
      system: instruction,
    };
    return registerModelConfigProvider(() => config);
  }, [registerModelConfigProvider, instruction]);
};
