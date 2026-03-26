"use client";

import { useCallback } from "react";
import {
  ActionButtonElement,
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useComposerSend as useComposerSendBehavior } from "@assistant-ui/core/react";

export const useComposerSend = () => {
  const { disabled, send } = useComposerSendBehavior();
  const callback = useCallback(() => send(), [send]);
  if (disabled) return null;
  return callback;
};

export namespace ComposerPrimitiveSend {
  export type Element = ActionButtonElement;
  /**
   * Props for the ComposerPrimitive.Send component.
   * Inherits all button element props and action button functionality.
   */
  export type Props = ActionButtonProps<typeof useComposerSend>;
}

/**
 * A button component that sends the current message in the composer.
 *
 * This component automatically handles the send functionality and is disabled
 * when sending is not available (e.g., when the thread is running, the composer
 * is empty, or not in editing mode).
 *
 * @example
 * ```tsx
 * <ComposerPrimitive.Send>
 *   Send Message
 * </ComposerPrimitive.Send>
 * ```
 */
export const ComposerPrimitiveSend = createActionButton(
  "ComposerPrimitive.Send",
  useComposerSend,
);
