"use client";

import { MessagePartState } from "../../legacy-runtime/runtime/MessagePartRuntime";
import { useAssistantState } from "../../context";
import type { ImageMessagePart } from "@assistant-ui/core";

export const useMessagePartImage = () => {
  const image = useAssistantState(({ part }) => {
    if (part.type !== "image")
      throw new Error(
        "MessagePartImage can only be used inside image message parts.",
      );

    return part as MessagePartState & ImageMessagePart;
  });

  return image;
};
