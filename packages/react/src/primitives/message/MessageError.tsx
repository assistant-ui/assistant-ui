"use client";

import { FC, PropsWithChildren } from "react";
import { useAuiState } from "@assistant-ui/store";

export const MessagePrimitiveError: FC<PropsWithChildren> = ({ children }) => {
  const hasError = useAuiState(
    ({ message }) =>
      message.status?.type === "incomplete" &&
      message.status.reason === "error",
  );
  return hasError ? children : null;
};

MessagePrimitiveError.displayName = "MessagePrimitive.Error";
