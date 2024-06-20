"use client";

import { Primitive } from "@radix-ui/react-primitive";
import { type ElementRef, forwardRef, ComponentPropsWithoutRef } from "react";
import { If } from "../message";

type BranchPickerRootElement = ElementRef<typeof Primitive.div>;
type PrimitiveDivProps = ComponentPropsWithoutRef<typeof Primitive.div>;

type BranchPickerRootProps = PrimitiveDivProps & {
  hideWhenSingleBranch?: boolean;
};

export const BranchPickerRoot = forwardRef<
  BranchPickerRootElement,
  BranchPickerRootProps
>(({ hideWhenSingleBranch, ...rest }, ref) => {
  return (
    <If hasBranches={hideWhenSingleBranch ? true : undefined}>
      <Primitive.div {...rest} ref={ref} />
    </If>
  );
});

BranchPickerRoot.displayName = "BranchPickerRoot";
