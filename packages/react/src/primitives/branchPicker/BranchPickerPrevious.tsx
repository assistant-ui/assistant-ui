"use client";

import { useBranchPickerPrevious } from "../../primitive-hooks/branchPicker/useBranchPickerPrevious";
import {
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";

export type BranchPickerPrimitivePreviousProps = ActionButtonProps<
  typeof useBranchPickerPrevious
>;

export const BranchPickerPrevious = createActionButton(
  "BranchPickerPrimitive.Previous",
  useBranchPickerPrevious,
);
