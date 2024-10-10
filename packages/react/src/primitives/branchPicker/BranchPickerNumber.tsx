"use client";

import type { FC } from "react";
import { useBranchPickerNumber } from "../../primitive-hooks/branchPicker/useBranchPickerNumber";

/**
 * @deprecated Use `BranchPickerPrimitive.Number.Props` instead. This will be removed in 0.6.
 */
export type BranchPickerPrimitiveNumberProps = BranchPickerPrimitiveNumber.Props;

export namespace BranchPickerPrimitiveNumber {
  export type Props = Record<string, never>;
}

export const BranchPickerPrimitiveNumber: FC<
  BranchPickerPrimitiveNumber.Props
> = () => {
  const branchNumber = useBranchPickerNumber();
  return <>{branchNumber}</>;
};

BranchPickerPrimitiveNumber.displayName = "BranchPickerPrimitive.Number";
