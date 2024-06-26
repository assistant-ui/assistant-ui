"use client";

import type { FC } from "react";
import { useBranchPickerNumber } from "../../primitive-hooks/branchPicker/useBranchPickerNumber";

export type BranchPickerPrimitiveNumberProps = {};

export const BranchPickerPrimitiveNumber: FC<
  BranchPickerPrimitiveNumberProps
> = () => {
  const branchNumber = useBranchPickerNumber();
  return <>{branchNumber}</>;
};

BranchPickerPrimitiveNumber.displayName = "BranchPickerPrimitive.Number";
