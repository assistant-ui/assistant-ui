"use client";

import { MessagePartState } from "../../legacy-runtime/runtime/MessagePartRuntime";
import { useAuiState } from "@assistant-ui/store";
import { ReasoningMessagePart } from "../../types";

export const useMessagePartReasoning = () => {
  const text = useAuiState((s) => {
    if (s.part.type !== "reasoning")
      throw new Error(
        "MessagePartReasoning can only be used inside reasoning message parts.",
      );

    return s.part as MessagePartState & ReasoningMessagePart;
  });

  return text;
};
