"use client";

import { useEffect } from "react";
import { useAssistantActions } from "../context/react/AssistantActionsContext";

type AssistantInstructionsConfig = {
  disabled?: boolean | undefined;
  instruction: string;
};

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
  const assistantActions = useAssistantActions();

  useEffect(() => {
    if (disabled) return;

    const config = {
      system: instruction,
    };
    return assistantActions.registerModelContextProvider({
      getModelContext: () => config,
    });
  }, [assistantActions, instruction, disabled]);
};
