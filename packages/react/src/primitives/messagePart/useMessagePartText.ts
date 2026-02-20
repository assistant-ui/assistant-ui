"use client";

import type {
  TextMessagePart,
  ReasoningMessagePart,
  MessagePartState,
} from "@assistant-ui/core";
import { useAuiState } from "@assistant-ui/store";

export const useMessagePartText = () => {
  const text = useAuiState((s) => {
    if (s.part.type !== "text" && s.part.type !== "reasoning")
      throw new Error(
        "MessagePartText can only be used inside text or reasoning message parts.",
      );

    return s.part as MessagePartState &
      (TextMessagePart | ReasoningMessagePart);
  });

  return text;
};
