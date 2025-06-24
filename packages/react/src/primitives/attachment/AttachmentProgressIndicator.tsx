"use client";

import { Primitive } from "@radix-ui/react-primitive";
import { ComponentPropsWithoutRef, ComponentRef, forwardRef } from "react";
import { useProgressContext } from "./progressScope";

type PrimitiveDivProps = ComponentPropsWithoutRef<typeof Primitive.div>;

export namespace AttachmentPrimitiveProgressIndicator {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = PrimitiveDivProps;
}

export const AttachmentPrimitiveProgressIndicator = forwardRef<
  AttachmentPrimitiveProgressIndicator.Element,
  AttachmentPrimitiveProgressIndicator.Props
>(
  (
    { style, ...props },
    ref,
  ) => {
    const context = useProgressContext();
    if (!context) {
      throw new Error("AttachmentPrimitiveProgressIndicator must be used within AttachmentPrimitiveProgressRoot");
    }
    
    const { value, max } = context;
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));

    return (
      <Primitive.div
        {...props}
        ref={ref}
        style={{
          transform: `translateX(-${100 - percentage}%)`,
          ...style,
        }}
      />
    );
  },
);

AttachmentPrimitiveProgressIndicator.displayName = "AttachmentPrimitive.ProgressIndicator";
