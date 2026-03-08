"use client";

import {
  ActionButtonElement,
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useCallback } from "react";
import { useAuiState, useAui } from "@assistant-ui/store";

const useComposerCancel = () => {
  const aui = useAui();
  const disabled = useAuiState((s) => !s.composer.canCancel);

  const callback = useCallback(() => {
    aui.composer().cancel();
  }, [aui]);

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
