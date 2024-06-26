"use client";

import { useBranchPickerNext } from "../../primitive-hooks/branchPicker/useBranchPickerNext";
import {
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";

export type BranchPickerPrimitiveNextProps = ActionButtonProps<
  typeof useBranchPickerNext
>;

export const BranchPickerPrimitiveNext = createActionButton(
  "BranchPickerPrimitive.Next",
  useBranchPickerNext,
);
