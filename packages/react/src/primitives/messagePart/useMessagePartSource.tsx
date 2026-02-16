"use client";

import type { SourceMessagePart } from "@assistant-ui/core";
import type { MessagePartState } from "../../legacy-runtime/runtime/MessagePartRuntime";
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
