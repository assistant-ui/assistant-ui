"use client";

import type { FC } from "react";
import { useBranchPickerCount } from "../../primitive-hooks/branchPicker/useBranchPickerCount";

export const BranchPickerCount: FC = () => {
  const branchCount = useBranchPickerCount();
  return <>{branchCount}</>;
};
