"use client";

import { MessagePartState } from "../../legacy-runtime/runtime/MessagePartRuntime";
import { useAuiState } from "@assistant-ui/store";
import { ImageMessagePart } from "../../types";

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
