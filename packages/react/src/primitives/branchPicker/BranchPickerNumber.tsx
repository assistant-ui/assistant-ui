"use client";

import type { FC } from "react";
import { useBranchPickerNumber } from "../../primitive-hooks/branchPicker/useBranchPickerNumber";

export const BranchPickerNumber: FC = () => {
  const branchNumber = useBranchPickerNumber();
  return <>{branchNumber}</>;
};
