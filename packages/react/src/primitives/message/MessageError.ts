"use client";

import { FC, PropsWithChildren } from "react";
import { useAuiState } from "@assistant-ui/store";

export const MessagePrimitiveError: FC<PropsWithChildren> = ({ children }) => {
  const hasError = useAuiState(
    (s) =>
      s.message.status?.type === "incomplete" &&
      s.message.status.reason === "error",
  );
  return hasError ? children : null;
};

MessagePrimitiveError.displayName = "MessagePrimitive.Error";
