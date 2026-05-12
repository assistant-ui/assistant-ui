"use client";

import type { FileMessagePart, MessagePartState } from "@assistant-ui/core";
import { useAuiState } from "@assistant-ui/store";

/**
 * @deprecated Use {@link useAuiState}: `useAuiState((s) => s.part)`. See the {@link https://assistant-ui.com/docs/migrations/v0-12 migration guide}.
 */
export const useMessagePartFile = () => {
  const file = useAuiState((s) => {
    if (s.part.type !== "file")
      throw new Error(
        "MessagePartFile can only be used inside file message parts.",
      );

    return s.part as MessagePartState & FileMessagePart;
  });

  return file;
};
