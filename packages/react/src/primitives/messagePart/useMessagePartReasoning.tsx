"use client";

import { MessagePartState } from "../../api/MessagePartRuntime";
import { useAssistantState } from "../../context";
import { ReasoningMessagePart } from "../../types";

export const useMessagePartReasoning = () => {
  const text = useAssistantState(({ part }) => {
    if (part.type !== "reasoning")
      throw new Error(
        "MessagePartReasoning can only be used inside reasoning message parts.",
      );

    return part as MessagePartState & ReasoningMessagePart;
  });

  return text;
};
