"use client";

import {
  ActionButtonElement,
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useBranchPickerNext as useBranchPickerNextBehavior } from "@assistant-ui/core/react";

const useBranchPickerNext = () => {
  const { disabled, next } = useBranchPickerNextBehavior();
  if (disabled) return null;
  return next;
};

export namespace BranchPickerPrimitiveNext {
  export type Element = ActionButtonElement;
  /**
   * Props for the BranchPickerPrimitive.Next component.
   * Inherits all button element props and action button functionality.
   */
  export type Props = ActionButtonProps<typeof useBranchPickerNext>;
}

/**
 * A button component that navigates to the next branch in the message tree.
 *
 * This component automatically handles switching to the next available branch
 * and is disabled when there are no more branches to navigate to.
 *
 * @example
 * ```tsx
 * <BranchPickerPrimitive.Next>
 *   Next →
 * </BranchPickerPrimitive.Next>
 * ```
 */
export const BranchPickerPrimitiveNext = createActionButton(
  "BranchPickerPrimitive.Next",
  useBranchPickerNext,
);
