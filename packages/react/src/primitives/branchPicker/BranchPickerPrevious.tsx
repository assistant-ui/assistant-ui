"use client";

import {
  ActionButtonElement,
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useCallback } from "react";
import { useAuiState, useAui } from "@assistant-ui/store";

/**
 * Hook that provides navigation to the previous branch functionality.
 *
 * This hook returns a callback function that switches to the previous branch
 * in the message branch tree, or null if there is no previous branch available.
 *
 * @returns A previous branch callback function, or null if navigation is disabled
 *
 * @example
 * ```tsx
 * function CustomPreviousButton() {
 *   const previous = useBranchPickerPrevious();
 *
 *   return (
 *     <button onClick={previous} disabled={!previous}>
 *       {previous ? "Previous Branch" : "No Previous Branch"}
 *     </button>
 *   );
 * }
 * ```
 */
const useBranchPickerPrevious = () => {
  const aui = useAui();
  const disabled = useAuiState((s) => {
    // Disabled if no previous branch
    if (s.message.branchNumber <= 1) return true;

    // Disabled if running and capability not supported
    if (s.thread.isRunning && !s.thread.capabilities.switchBranchDuringRun) {
      return true;
    }

    return false;
  });

  const callback = useCallback(() => {
    aui.message().switchToBranch({ position: "previous" });
  }, [aui]);

  if (disabled) return null;
  return callback;
};

export namespace BranchPickerPrimitivePrevious {
  export type Element = ActionButtonElement;
  /**
   * Props for the BranchPickerPrimitive.Previous component.
   * Inherits all button element props and action button functionality.
   */
  export type Props = ActionButtonProps<typeof useBranchPickerPrevious>;
}

/**
 * A button component that navigates to the previous branch in the message tree.
 *
 * This component automatically handles switching to the previous available branch
 * and is disabled when there are no previous branches to navigate to.
 *
 * @example
 * ```tsx
 * <BranchPickerPrimitive.Previous>
 *   ← Previous
 * </BranchPickerPrimitive.Previous>
 * ```
 */
export const BranchPickerPrimitivePrevious = createActionButton(
  "BranchPickerPrimitive.Previous",
  useBranchPickerPrevious,
);
