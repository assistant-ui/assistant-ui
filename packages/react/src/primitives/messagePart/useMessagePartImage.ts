"use client";

import type { ImageMessagePart, MessagePartState } from "@assistant-ui/core";
import { useAuiState } from "@assistant-ui/store";

export const useMessagePartImage = () => {
  const image = useAuiState((s) => {
    if (s.part.type !== "image")
      throw new Error(
        "MessagePartImage can only be used inside image message parts.",
      );

    return s.part as MessagePartState & ImageMessagePart;
  });

  return image;
};
