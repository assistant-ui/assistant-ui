"use client";

import { useAuiState } from "@assistant-ui/store";
import { DataMessagePart } from "../../types";

export const useMessagePartData = <T = any>(name?: string) => {
  const part = useAuiState(({ part }) => {
    if (part.type !== "data") {
      return null;
    }
    return part as DataMessagePart<T>;
  });

  if (!part) {
    return null;
  }

  if (name && part.name !== name) {
    return null;
  }

  return part;
};
