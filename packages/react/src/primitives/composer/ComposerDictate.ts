"use client";

import type {
  ActionButtonElement,
  ActionButtonProps,
} from "../../utils/createActionButton";
import { createActionButton } from "../../utils/createActionButton";
import { useComposerDictate as useComposerDictateBehavior } from "@assistant-ui/core/react";

const useComposerDictate = () => {
  const { disabled, startDictation } = useComposerDictateBehavior();
  if (disabled) return null;
  return startDictation;
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
