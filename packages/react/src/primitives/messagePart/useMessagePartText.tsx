"use client";

import { MessagePartState } from "../../legacy-runtime/runtime/MessagePartRuntime";
import { useAssistantState } from "../../context";
import { TextMessagePart, ReasoningMessagePart } from "../../types";

export const useMessagePartText = () => {
  const text = useAssistantState(({ part }) => {
    if (part.type !== "text" && part.type !== "reasoning")
      throw new Error(
        "MessagePartText can only be used inside text or reasoning message parts.",
      );

    return part as MessagePartState & (TextMessagePart | ReasoningMessagePart);
  });

  return text;
};
