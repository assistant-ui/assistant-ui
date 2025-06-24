"use client";

import { Primitive } from "@radix-ui/react-primitive";
import { ComponentPropsWithoutRef, ComponentRef, forwardRef } from "react";
import { ProgressContext, ProgressContextValue } from "./progressScope";

type PrimitiveDivProps = ComponentPropsWithoutRef<typeof Primitive.div>;

export namespace AttachmentPrimitiveProgressRoot {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = PrimitiveDivProps & {
    value?: number;
    max?: number;
  };
}

export const AttachmentPrimitiveProgressRoot = forwardRef<
  AttachmentPrimitiveProgressRoot.Element,
  AttachmentPrimitiveProgressRoot.Props
>(({ value = 0, max = 100, ...props }, ref) => {
  const contextValue: ProgressContextValue = { value, max };

  return (
    <ProgressContext.Provider value={contextValue}>
      <Primitive.div
        {...props}
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
      />
    </ProgressContext.Provider>
  );
});

AttachmentPrimitiveProgressRoot.displayName =
  "AttachmentPrimitive.ProgressRoot";
