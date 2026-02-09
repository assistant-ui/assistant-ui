"use client";

import type { MessagePartState } from "../../legacy-runtime/runtime/MessagePartRuntime";
import { useAuiState } from "@assistant-ui/store";
import { SourceMessagePart } from "../../types";

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
