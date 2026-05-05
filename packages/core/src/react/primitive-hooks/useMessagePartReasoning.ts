"use client";

import type { ReasoningMessagePart } from "../../types/message";
import type { MessagePartState } from "../../runtime/api/message-part-runtime";
import { useAuiState } from "@assistant-ui/store";

export const useMessagePartReasoning = () => {
  const reasoning = useAuiState((s) => {
    if (s.part.type !== "reasoning")
      throw new Error(
        "MessagePartReasoning can only be used inside reasoning message parts.",
      );

    return s.part as MessagePartState & ReasoningMessagePart;
  });

  return reasoning;
};
