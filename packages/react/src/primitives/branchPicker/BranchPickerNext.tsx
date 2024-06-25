"use client";

import { useBranchPickerNext } from "../../primitive-hooks/branchPicker/useBranchPickerNext";
import { createActionButton } from "../../utils/createActionButton";

export const BranchPickerNext = createActionButton(
  "BranchPickerNext",
  useBranchPickerNext,
);
