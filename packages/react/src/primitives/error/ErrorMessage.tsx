"use client";

import { Primitive } from "@radix-ui/react-primitive";
import { type ComponentRef, forwardRef, ComponentPropsWithoutRef } from "react";
import { useMessageError } from "@assistant-ui/core/react";

export namespace ErrorPrimitiveMessage {
  export type Element = ComponentRef<typeof Primitive.span>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.span>;
}

export const ErrorPrimitiveMessage = forwardRef<
  ErrorPrimitiveMessage.Element,
  ErrorPrimitiveMessage.Props
>(({ children, ...props }, forwardRef) => {
  const error = useMessageError();

  if (error === undefined) return null;

  return (
    <Primitive.span {...props} ref={forwardRef}>
      {children ?? String(error)}
    </Primitive.span>
  );
});

ErrorPrimitiveMessage.displayName = "ErrorPrimitive.Message";
