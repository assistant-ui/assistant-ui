"use client";

import { useCallback } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";
import type {
  ActionButtonElement,
  ActionButtonProps,
} from "../../utils/createActionButton";
import { createActionButton } from "../../utils/createActionButton";

const useComposerDictate = () => {
  const aui = useAui();
  const disabled = useAuiState(
    (s) =>
      s.composer.dictation != null ||
      !s.thread.capabilities.dictation ||
      !s.composer.isEditing,
  );

  const callback = useCallback(() => {
    aui.composer().startDictation();
  }, [aui]);

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
