"use client";

import { Primitive } from "@radix-ui/react-primitive";
import { type ElementRef, forwardRef, ComponentPropsWithoutRef } from "react";
import { If } from "../message";

/**
 * @deprecated Use `BranchPickerPrimitive.Root.Props` instead. This will be removed in 0.6.
 */
export type BranchPickerPrimitiveRootProps = BranchPickerPrimitiveRoot.Props;

export namespace BranchPickerPrimitiveRoot {
  export type Element = ElementRef<typeof Primitive.div>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.div> & {
    hideWhenSingleBranch?: boolean | undefined;
  };
}

export const BranchPickerPrimitiveRoot = forwardRef<
  BranchPickerPrimitiveRoot.Element,
  BranchPickerPrimitiveRoot.Props
>(({ hideWhenSingleBranch, ...rest }, ref) => {
  return (
    <If hasBranches={hideWhenSingleBranch ? true : undefined}>
      <Primitive.div {...rest} ref={ref} />
    </If>
  );
});

BranchPickerPrimitiveRoot.displayName = "BranchPickerPrimitive.Root";
