"use client";

import { useEffect } from "react";
import { useAssistantRuntime } from "../context";

export const useAssistantInstructions = (instruction: string) => {
  const assistantRuntime = useAssistantRuntime();
  useEffect(() => {
    const config = {
      system: instruction,
    };
    return assistantRuntime.registerModelConfigProvider({
      getModelConfig: () => config,
    });
  }, [assistantRuntime, instruction]);
};
