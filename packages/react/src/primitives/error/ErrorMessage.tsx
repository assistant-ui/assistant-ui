"use client";

import { Primitive } from "@radix-ui/react-primitive";
import { type ComponentRef, forwardRef, ComponentPropsWithoutRef } from "react";
import { useAssistantState } from "../../context";

export namespace ErrorPrimitiveMessage {
  export type Element = ComponentRef<typeof Primitive.span>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.span>;
}

export const ErrorPrimitiveMessage = forwardRef<
  ErrorPrimitiveMessage.Element,
  ErrorPrimitiveMessage.Props
>(({ children, ...props }, forwardRef) => {
  const error = useAssistantState(({ message }) => {
    return message.status?.type === "incomplete" &&
      message.status.reason === "error"
      ? message.status.error
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
