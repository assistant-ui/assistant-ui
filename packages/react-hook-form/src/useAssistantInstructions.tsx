"use client";

import { useRegisterAssistantContextValue } from "@assistant-ui/react-system";

export const useAssistantInstructions = (instruction: string) => {
  useRegisterAssistantContextValue(() => instruction);
};
