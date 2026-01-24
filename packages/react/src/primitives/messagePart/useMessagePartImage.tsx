"use client";

import { MessagePartState } from "../../legacy-runtime/runtime/MessagePartRuntime";
import { useAuiState } from "@assistant-ui/store";
import { ImageMessagePart } from "../../types";

export const useMessagePartImage = () => {
  const image = useAuiState(({ part }) => {
    if (part.type !== "image")
      throw new Error(
        "MessagePartImage can only be used inside image message parts.",
      );

    return part as MessagePartState & ImageMessagePart;
  });

  return image;
};
