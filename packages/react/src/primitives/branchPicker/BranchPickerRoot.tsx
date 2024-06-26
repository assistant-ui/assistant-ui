"use client";

import { Primitive } from "@radix-ui/react-primitive";
import { type ElementRef, forwardRef, ComponentPropsWithoutRef } from "react";
import { If } from "../message";

type BranchPickerPrimitiveRootElement = ElementRef<typeof Primitive.div>;
type PrimitiveDivProps = ComponentPropsWithoutRef<typeof Primitive.div>;

export type BranchPickerPrimitiveRootProps = PrimitiveDivProps & {
  hideWhenSingleBranch?: boolean;
};

export const BranchPickerPrimitiveRoot = forwardRef<
  BranchPickerPrimitiveRootElement,
  BranchPickerPrimitiveRootProps
>(({ hideWhenSingleBranch, ...rest }, ref) => {
  return (
    <If hasBranches={hideWhenSingleBranch ? true : undefined}>
      <Primitive.div {...rest} ref={ref} />
    </If>
  );
});

BranchPickerPrimitiveRoot.displayName = "BranchPickerPrimitive.Root";
