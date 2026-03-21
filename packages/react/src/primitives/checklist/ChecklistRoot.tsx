"use client";

import { Primitive } from "@radix-ui/react-primitive";
import { type ComponentRef, forwardRef, ComponentPropsWithoutRef } from "react";

export namespace ChecklistPrimitiveRoot {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.div>;
}

export const ChecklistPrimitiveRoot = forwardRef<
  ChecklistPrimitiveRoot.Element,
  ChecklistPrimitiveRoot.Props
>((props, ref) => {
  return <Primitive.div {...props} ref={ref} />;
});

ChecklistPrimitiveRoot.displayName = "ChecklistPrimitive.Root";
