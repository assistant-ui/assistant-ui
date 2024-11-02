"use client";

import { useBranchPickerNext } from "../../primitive-hooks/branchPicker/useBranchPickerNext";
import {
  ActionButtonElement,
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";

export namespace BranchPickerPrimitiveNext {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useBranchPickerNext>;
}

export const BranchPickerPrimitiveNext = createActionButton(
  "BranchPickerPrimitive.Next",
  useBranchPickerNext,
);
