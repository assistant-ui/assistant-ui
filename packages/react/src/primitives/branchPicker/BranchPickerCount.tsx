"use client";

import type { FC } from "react";
import { useBranchPickerCount } from "../../primitive-hooks/branchPicker/useBranchPickerCount";

export type BranchPickerPrimitiveCountProps = {};

export const BranchPickerPrimitiveCount: FC<
  BranchPickerPrimitiveCountProps
> = () => {
  const branchCount = useBranchPickerCount();
  return <>{branchCount}</>;
};

BranchPickerPrimitiveCount.displayName = "BranchPickerPrimitive.Count";
