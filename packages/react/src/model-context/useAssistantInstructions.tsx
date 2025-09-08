"use client";

import { useEffect } from "react";
import { useAssistantApi } from "../context/react/AssistantApiContext";

export type AssistantInstructionsConfig = {
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
  const api = useAssistantApi();

  useEffect(() => {
    if (disabled) return;

    const config = {
      system: instruction,
    };
    return api.registerModelContextProvider({
      getModelContext: () => config,
    });
  }, [api, instruction, disabled]);
};
