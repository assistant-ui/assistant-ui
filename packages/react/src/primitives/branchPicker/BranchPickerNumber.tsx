"use client";

import type { FC } from "react";
import { useAuiState } from "@assistant-ui/store";

const useBranchPickerNumber = () => {
  const branchNumber = useAuiState((s) => s.message.branchNumber);
  return branchNumber;
};

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
