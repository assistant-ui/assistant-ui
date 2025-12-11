"use client";

import { MessagePartState } from "../../legacy-runtime/runtime/MessagePartRuntime";
import { useAssistantState } from "../../context";
import type { FileMessagePart } from "@assistant-ui/core";

export const useMessagePartFile = () => {
  const file = useAssistantState(({ part }) => {
    if (part.type !== "file")
      throw new Error(
        "MessagePartFile can only be used inside file message parts.",
      );

    return part as MessagePartState & FileMessagePart;
  });

  return file;
};
