"use client";

import { useEffect } from "react";
import { useAssistantActionsStore } from "../context";

export const useAssistantInstructions = (instruction: string) => {
  const actionsStore = useAssistantActionsStore();
  useEffect(() => {
    const config = {
      system: instruction,
    };
    return actionsStore
      .getState()
      .registerModelConfigProvider({ getModelConfig: () => config });
  }, [actionsStore, instruction]);
};
