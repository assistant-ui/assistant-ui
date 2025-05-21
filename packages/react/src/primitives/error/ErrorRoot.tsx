"use client";

import { Primitive } from "@radix-ui/react-primitive";
import {
  type ComponentRef,
  forwardRef,
  ComponentPropsWithoutRef,
} from "react";

export namespace ErrorPrimitiveRoot {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.div>;
}

export const ErrorPrimitiveRoot = forwardRef<
  ErrorPrimitiveRoot.Element,
  ErrorPrimitiveRoot.Props
>((props, forwardRef) => {
  return <Primitive.div {...props} ref={forwardRef} role="alert" />;
});

ErrorPrimitiveRoot.displayName = "ErrorPrimitive.Root";