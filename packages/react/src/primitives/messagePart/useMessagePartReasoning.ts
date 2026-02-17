"use client";

import type {
  ReasoningMessagePart,
  MessagePartState,
} from "@assistant-ui/core";
import { useAuiState } from "@assistant-ui/store";

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
