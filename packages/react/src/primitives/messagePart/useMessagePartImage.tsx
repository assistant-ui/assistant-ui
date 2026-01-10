"use client";

import { MessagePartState } from "../../legacy-runtime/runtime/MessagePartRuntime";
import { useAssistantState } from "@assistant-ui/store";
import { ImageMessagePart } from "../../types";

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
