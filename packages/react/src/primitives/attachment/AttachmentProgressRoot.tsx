"use client";

import { Primitive } from "@radix-ui/react-primitive";
import { ComponentPropsWithoutRef, ComponentRef, forwardRef } from "react";
import { useAttachment } from "../../context/react/AttachmentContext";
import { ProgressContext, ProgressContextValue } from "./progressScope";

type PrimitiveDivProps = ComponentPropsWithoutRef<typeof Primitive.div>;

export namespace AttachmentPrimitiveProgressRoot {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = PrimitiveDivProps;
}

export const AttachmentPrimitiveProgressRoot = forwardRef<
  AttachmentPrimitiveProgressRoot.Element,
  AttachmentPrimitiveProgressRoot.Props
>((props, ref) => {
  const progress = useAttachment((a) => {
    if (a.status.type === "running" && "progress" in a.status) {
      return a.status.progress;
    }
    return null;
  });

  const value = progress ?? 0;
  const max = 100;
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
