"use client";

import type { MessagePartState } from "../../legacy-runtime/runtime/MessagePartRuntime";
import { useAssistantState } from "../../context";
import type { SourceMessagePart } from "@assistant-ui/core";

export const useMessagePartSource = () => {
  const source = useAssistantState(({ part }) => {
    if (part.type !== "source")
      throw new Error(
        "MessagePartSource can only be used inside source message parts.",
      );

    return part as MessagePartState & SourceMessagePart;
  });

  return source;
};
