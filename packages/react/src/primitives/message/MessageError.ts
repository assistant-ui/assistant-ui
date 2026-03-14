"use client";

import { FC, PropsWithChildren } from "react";
import { useMessageError } from "@assistant-ui/core/react";

export const MessagePrimitiveError: FC<PropsWithChildren> = ({ children }) => {
  const error = useMessageError();
  return error !== undefined ? children : null;
};

MessagePrimitiveError.displayName = "MessagePrimitive.Error";
