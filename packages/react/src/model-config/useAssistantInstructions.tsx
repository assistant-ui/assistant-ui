"use client";

import { useEffect } from "react";
import { useAssistantRuntimeStore } from "../context";

export const useAssistantInstructions = (instruction: string) => {
  const runtimeStore = useAssistantRuntimeStore();
  useEffect(() => {
    const config = {
      system: instruction,
    };
    return runtimeStore
      .getState()
      .registerModelConfigProvider({ getModelConfig: () => config });
  }, [runtimeStore, instruction]);
};
