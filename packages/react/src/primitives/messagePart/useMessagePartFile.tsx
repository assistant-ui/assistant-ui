"use client";

import { MessagePartState } from "../../legacy-runtime/runtime/MessagePartRuntime";
import { useAuiState } from "@assistant-ui/store";
import { FileMessagePart } from "../../types";

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
