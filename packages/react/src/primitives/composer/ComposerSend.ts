"use client";

import { useCallback } from "react";
import {
  type ActionButtonElement,
  type ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useComposerSend as useComposerSendBehavior } from "@assistant-ui/core/react";

export const useComposerSend = ({
  queueWhileRunning = false,
}: { queueWhileRunning?: boolean } = {}) => {
  const { disabled, send } = useComposerSendBehavior(queueWhileRunning);
  const callback = useCallback(() => send(), [send]);
  if (disabled) return null;
  return callback;
};

export namespace ComposerPrimitiveSend {
  export type Element = ActionButtonElement;
  /**
   * Props for the ComposerPrimitive.Send component.
   * Inherits all button element props and action button functionality.
   *
   * `queueWhileRunning` keeps the button enabled while the thread is running;
   * the message is queued and sent when the run ends.
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
  ["queueWhileRunning"],
);
