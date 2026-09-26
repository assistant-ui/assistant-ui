"use client";

import {
  type ActionButtonElement,
  type ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import type { MouseEvent } from "react";
import { useComposerCancelWithFocus } from "./useComposerCancelWithFocus";

const useComposerCancel = () => {
  const { disabled, cancel } = useComposerCancelWithFocus();
  if (disabled) return null;
  return (event: MouseEvent<HTMLButtonElement>) => cancel(event.currentTarget);
};

export namespace ComposerPrimitiveCancel {
  export type Element = ActionButtonElement;
  /**
   * Props for the ComposerPrimitive.Cancel component.
   * Inherits all button element props and action button functionality.
   */
  export type Props = ActionButtonProps<typeof useComposerCancel>;
}

/**
 * A button component that cancels the current message composition.
 *
 * This component automatically handles the cancel functionality and is disabled
 * when canceling is not available.
 *
 * @example
 * ```tsx
 * <ComposerPrimitive.Cancel>
 *   Cancel
 * </ComposerPrimitive.Cancel>
 * ```
 */
export const ComposerPrimitiveCancel = createActionButton(
  "ComposerPrimitive.Cancel",
  useComposerCancel,
);
