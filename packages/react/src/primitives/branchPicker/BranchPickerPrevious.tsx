"use client";

import { useBranchPickerPrevious } from "../../primitive-hooks/branchPicker/useBranchPickerPrevious";
import { createActionButton } from "../../utils/createActionButton";

export const BranchPickerPrevious = createActionButton(
  "BranchPickerPrevious",
  useBranchPickerPrevious,
);
