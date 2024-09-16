"use client";

import { useEffect } from "react";
import { useModelConfigStore } from "../context";

export const useAssistantInstructions = (instruction: string) => {
  const modelConfigStore = useModelConfigStore();
  useEffect(() => {
    const config = {
      system: instruction,
    };
    return modelConfigStore
      .getState()
      .registerModelConfigProvider({ getModelConfig: () => config });
  }, [modelConfigStore, instruction]);
};
