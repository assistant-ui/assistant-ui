"use client";

import {
  ActionButtonElement,
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useCallback } from "react";
import { useCombinedStore } from "../../utils/combined/useCombinedStore";
import { useThreadRuntime } from "../../context/react/ThreadContext";
import { useComposerRuntime } from "../../context";

/**
 * Hook that provides the send functionality for the composer.
 * 
 * This hook returns a callback function that sends the current message,
 * or null if sending is not currently available (e.g., thread is running,
 * composer is empty, or not in editing mode).
 * 
 * @returns A send callback function, or null if sending is disabled
 * 
 * @example
 * ```tsx
 * function CustomSendButton() {
 *   const send = useComposerSend();
 *   
 *   return (
 *     <button onClick={send} disabled={!send}>
 *       {send ? "Send Message" : "Cannot Send"}
 *     </button>
 *   );
 * }
 * ```
 */
export const useComposerSend = () => {
  const composerRuntime = useComposerRuntime();
  const threadRuntime = useThreadRuntime();

  const disabled = useCombinedStore(
    [threadRuntime, composerRuntime],
    (t, c) => t.isRunning || !c.isEditing || c.isEmpty,
  );

  const callback = useCallback(() => {
    composerRuntime.send();
  }, [composerRuntime]);

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
