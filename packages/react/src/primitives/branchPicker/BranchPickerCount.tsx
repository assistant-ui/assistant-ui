"use client";

import type { FC } from "react";
import { useBranchPickerCount } from "../../primitive-hooks/branchPicker/useBranchPickerCount";

export namespace BranchPickerPrimitiveCount {
  export type Props = Record<string, never>;
}

export const BranchPickerPrimitiveCount: FC<
  BranchPickerPrimitiveCount.Props
> = () => {
  const branchCount = useBranchPickerCount();
  return <>{branchCount}</>;
};

BranchPickerPrimitiveCount.displayName = "BranchPickerPrimitive.Count";
