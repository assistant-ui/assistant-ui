"use client";

import { useBranchPickerPrevious } from "../../primitive-hooks/branchPicker/useBranchPickerPrevious";
import {
  ActionButtonElement,
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";

/**
 * @deprecated Use `BranchPickerPrimitive.Previous.Props` instead. This will be removed in 0.6.
 */
export type BranchPickerPrimitivePreviousProps = BranchPickerPrimitivePrevious.Props;

export namespace BranchPickerPrimitivePrevious {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useBranchPickerPrevious>;
}

export const BranchPickerPrimitivePrevious = createActionButton(
  "BranchPickerPrimitive.Previous",
  useBranchPickerPrevious
);
