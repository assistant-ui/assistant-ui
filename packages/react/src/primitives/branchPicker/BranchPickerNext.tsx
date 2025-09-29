"use client";

import {
  ActionButtonElement,
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useCallback } from "react";
import { useAssistantState, useAssistantApi } from "../../context";

const useBranchPickerNext = () => {
  const api = useAssistantApi();
  const disabled = useAssistantState(({ thread, message }) => {
    // Disabled if no next branch
    if (message.branchNumber >= message.branchCount) return true;

    // Disabled if running and capability not supported
    if (thread.isRunning && !thread.capabilities.switchBranchDuringRun) {
      return true;
    }

    return false;
  });

  const callback = useCallback(() => {
    api.message().switchToBranch({ position: "next" });
  }, [api]);

  if (disabled) return null;
  return callback;
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
