"use client";

import type { SourceMessagePart } from "../../types/message";
import type { MessagePartState } from "../../runtime/api/message-part-runtime";
import { useAuiState } from "@assistant-ui/store";

export const useMessagePartSource = () => {
  const source = useAuiState((s) => {
    if (s.part.type !== "source")
      throw new Error(
        "MessagePartSource can only be used inside source message parts.",
      );

    return s.part as MessagePartState & SourceMessagePart;
  });

  return source;
};
