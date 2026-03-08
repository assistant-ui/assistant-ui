"use client";

import type { DataMessagePart } from "@assistant-ui/core";
import { useAuiState } from "@assistant-ui/store";

export const useMessagePartData = <T = any>(name?: string) => {
  const part = useAuiState((s) => {
    if (s.part.type !== "data") {
      return null;
    }
    return s.part as DataMessagePart<T>;
  });

  if (!part) {
    return null;
  }

  if (name && part.name !== name) {
    return null;
  }

  return part;
};
