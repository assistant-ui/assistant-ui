"use client";

import { useEffect } from "react";
import { useAui } from "@assistant-ui/store";
import type { AssistantInstructionsConfig } from "./AssistantToolTypes";

export type { AssistantInstructionsConfig };

const getInstructions = (
  instruction: string | AssistantInstructionsConfig,
): AssistantInstructionsConfig => {
  if (typeof instruction === "string") return { instruction };
  return instruction;
};

export const useAssistantInstructions = (
  config: string | AssistantInstructionsConfig,
) => {
  const { instruction, disabled = false } = getInstructions(config);
  const aui = useAui();

  useEffect(() => {
    if (disabled) return;

    const config = {
      system: instruction,
    };
    return aui.modelContext().register({
      getModelContext: () => config,
    });
  }, [aui, instruction, disabled]);
};
