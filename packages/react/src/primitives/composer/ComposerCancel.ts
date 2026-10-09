"use client";

import {
  type ActionButtonElement,
  type ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import type { MouseEvent } from "react";
import { useComposerCancel as useComposerCancelBehavior } from "@assistant-ui/core/react";
import { useComposerCancelWithFocus } from "./useComposerCancelWithFocus";

const useComposerCancel = () => {
  const { disabled, cancel } = useComposerCancelBehavior();
  const cancelWithFocus = useComposerCancelWithFocus(cancel);
  if (disabled) return null;
  return (event: MouseEvent<HTMLButtonElement>) =>
    cancelWithFocus(event.detail === 0 ? event.currentTarget : null);
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
 * Keyboard or assistive-technology activation after editing returns focus to the
 * main thread composer when available, unless a handler has moved focus elsewhere.
 * Pointer activation preserves the existing focus behavior.
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
