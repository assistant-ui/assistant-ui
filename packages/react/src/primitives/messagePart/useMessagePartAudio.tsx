"use client";

import { MessagePartState } from "../../legacy-runtime/runtime/MessagePartRuntime";
import { useAssistantState } from "../../context";
import { Unstable_AudioMessagePart } from "../../types";

export const useMessagePartAudio = () => {
  const audio = useAssistantState(({ part }) => {
    if (part.type !== "audio")
      throw new Error(
        "MessagePartAudio can only be used inside audio message parts.",
      );

    return part as MessagePartState & Unstable_AudioMessagePart;
  });

  return audio;
};
