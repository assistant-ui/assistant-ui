
"use client";

import { useBranchPickerNext } from "../../primitive-hooks/branchPicker/useBranchPickerNext";
import {
  ActionButtonElement,
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";

/**
 * @deprecated Use `BranchPickerPrimitive.Next.Props` instead. This will be removed in 0.6.
 */
export type BranchPickerPrimitiveNextProps = BranchPickerPrimitiveNext.Props;

export namespace BranchPickerPrimitiveNext {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useBranchPickerNext>;
}

export const BranchPickerPrimitiveNext = createActionButton(
  "BranchPickerPrimitive.Next",
  useBranchPickerNext,
);
