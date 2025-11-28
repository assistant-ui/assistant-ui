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
  const isListening = useAssistantState(
    ({ composer }) => composer.listening != null,
  );

  const callback = useCallback(() => {
    api.composer().stopListening();
  }, [api]);

  if (!isListening) return null;
  return callback;
};

export namespace ComposerPrimitiveStopDictation {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useComposerStopDictation>;
}

/**
 * A button that stops the current speech recognition (dictation) session.
 *
 * Only visible when dictation is active.
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
