"use client";

import { MessagePartState } from "../../api/MessagePartRuntime";
import { useAssistantState } from "../../context";
import { SourceMessagePart } from "../../types";

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
