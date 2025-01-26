"use client";

import type { FC } from "react";
import { useMessage } from "../../context/react/MessageContext";

const useBranchPickerCount = () => {
  const branchCount = useMessage((s) => s.branchCount);
  return branchCount;
};

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
