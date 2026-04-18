"use client";

import { useCallback } from "react";
import { useAui } from "@assistant-ui/store";
import type {
  ActionButtonElement,
  ActionButtonProps,
} from "../../utils/createActionButton";
import { createActionButton } from "../../utils/createActionButton";
import { useAuiState } from "@assistant-ui/store";

const useComposerStopDictation = () => {
  const aui = useAui();
  const isDictating = useAuiState((s) => s.composer.dictation != null);

  const callback = useCallback(() => {
    aui.composer().stopDictation();
  }, [aui]);

  if (!isDictating) return null;
  return callback;
};

export namespace ComposerPrimitiveStopDictation {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useComposerStopDictation>;
}

/**
 * A button that stops the current dictation session.
 *
 * Only rendered when dictation is active.
 *
 * @example
 * ```tsx
 * <ComposerPrimitive.StopDictation>
 *   <StopIcon />
 * </ComposerPrimitive.StopDictation>
 * ```
 */
export const ComposerPrimitiveStopDictation = createActionButton(
  "ComposerPrimitive.StopDictation",
  useComposerStopDictation,
);
