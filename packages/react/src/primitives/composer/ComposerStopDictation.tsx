"use client";

import { useCallback } from "react";
import { useAssistantState, useAssistantApi } from "../../context";
import type {
  ActionButtonElement,
  ActionButtonProps,
} from "../../utils/createActionButton";
import { createActionButton } from "../../utils/createActionButton";

const useComposerStopDictation = () => {
  const api = useAssistantApi();
  const isDictating = useAssistantState(
    ({ composer }) => composer.dictation != null,
  );

  const callback = useCallback(() => {
    api.composer().stopDictation();
  }, [api]);

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
