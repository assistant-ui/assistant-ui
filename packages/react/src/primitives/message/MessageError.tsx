"use client";

import { FC, PropsWithChildren } from "react";
import { useAssistantState } from "../../context";

export const MessagePrimitiveError: FC<PropsWithChildren> = ({ children }) => {
  const hasError = useAssistantState(
    ({ message }) =>
      message.status?.type === "incomplete" &&
      message.status.reason === "error",
  );
  return hasError ? <>{children}</> : null;
};

MessagePrimitiveError.displayName = "MessagePrimitive.Error";
