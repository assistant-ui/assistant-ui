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
  const disabled = useAssistantState(
    ({ thread, composer }) =>
      composer.dictation != null ||
      !thread.capabilities.dictation ||
      !composer.isEditing,
  );

  const callback = useCallback(() => {
    api.composer().startDictation();
  }, [api]);

  if (disabled) return null;
  return callback;
};

export namespace ComposerPrimitiveDictate {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useComposerDictate>;
}

/**
 * A button that starts dictation to convert voice to text.
 *
 * Requires a DictationAdapter to be configured in the runtime.
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
