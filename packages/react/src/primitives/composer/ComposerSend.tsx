"use client";

import {
  ActionButtonElement,
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useCallback } from "react";
import { useAssistantState, useAssistantApi } from "../../context";

export const useComposerSend = () => {
  const api = useAssistantApi();

  const disabled = useAssistantState(
    (s) => s.thread.isRunning || !s.composer.isEditing || s.composer.isEmpty,
  );

  const callback = useCallback(() => {
    api.composer().send();
  }, [api]);

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
