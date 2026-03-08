"use client";

import { Primitive } from "@radix-ui/react-primitive";
import { type ComponentRef, forwardRef, ComponentPropsWithoutRef } from "react";
import { useAuiState } from "@assistant-ui/store";

export namespace ErrorPrimitiveMessage {
  export type Element = ComponentRef<typeof Primitive.span>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.span>;
}

export const ErrorPrimitiveMessage = forwardRef<
  ErrorPrimitiveMessage.Element,
  ErrorPrimitiveMessage.Props
>(({ children, ...props }, forwardRef) => {
  const error = useAuiState((s) => {
    return s.message.status?.type === "incomplete" &&
      s.message.status.reason === "error"
      ? s.message.status.error
      : undefined;
  });

  if (error === undefined) return null;

  return (
    <Primitive.span {...props} ref={forwardRef}>
      {children ?? String(error)}
    </Primitive.span>
  );
});

ErrorPrimitiveMessage.displayName = "ErrorPrimitive.Message";
