"use client";

import { useCallback } from "react";
import { useAssistantState, useAssistantApi } from "../../context";
import type {
  ActionButtonElement,
  ActionButtonProps,
} from "../../utils/createActionButton";
import { createActionButton } from "../../utils/createActionButton";

const useComposerDictate = () => {
  const api = useAssistantApi();
  const isListening = useAssistantState(
    ({ composer }) => composer.listening != null,
  );
  const canDictate = useAssistantState(
    ({ thread }) => thread.capabilities.dictation,
  );
  const isEditing = useAssistantState(({ composer }) => composer.isEditing);

  const callback = useCallback(() => {
    api.composer().startListening();
  }, [api]);

  if (isListening || !canDictate || !isEditing) return null;
  return callback;
};

export namespace ComposerPrimitiveDictate {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useComposerDictate>;
}

/**
 * A button that starts speech recognition (dictation) to convert voice to text.
 *
 * Requires a SpeechRecognitionAdapter to be configured in the runtime.
 *
 * @example
 * ```tsx
 * <ComposerPrimitive.Dictate>
 *   <MicIcon />
 * </ComposerPrimitive.Dictate>
 * ```
 */
export const ComposerPrimitiveDictate = createActionButton(
  "ComposerPrimitive.Dictate",
  useComposerDictate,
);
