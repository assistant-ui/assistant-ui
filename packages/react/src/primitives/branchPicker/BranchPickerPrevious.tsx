"use client";

import { useBranchPickerPrevious } from "../../primitive-hooks/branchPicker/useBranchPickerPrevious";
import {
  ActionButtonElement,
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";

export namespace BranchPickerPrimitivePrevious {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useBranchPickerPrevious>;
}

export const BranchPickerPrimitivePrevious = createActionButton(
  "BranchPickerPrimitive.Previous",
  useBranchPickerPrevious,
);
