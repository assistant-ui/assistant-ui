"use client";

import {
  ActionButtonElement,
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useCallback } from "react";
import { useComposer, useComposerRuntime } from "../../context";

/**
 * Hook that provides the cancel functionality for the composer.
 * 
 * This hook returns a callback function that cancels the current message composition,
 * or null if canceling is not currently available.
 * 
 * @returns A cancel callback function, or null if canceling is disabled
 * 
 * @example
 * ```tsx
 * function CustomCancelButton() {
 *   const cancel = useComposerCancel();
 *   
 *   return (
 *     <button onClick={cancel} disabled={!cancel}>
 *       {cancel ? "Cancel" : "Cannot Cancel"}
 *     </button>
 *   );
 * }
 * ```
 */
const useComposerCancel = () => {
  const composerRuntime = useComposerRuntime();
  const disabled = useComposer((c) => !c.canCancel);

  const callback = useCallback(() => {
    composerRuntime.cancel();
  }, [composerRuntime]);

  if (disabled) return null;
  return callback;
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
