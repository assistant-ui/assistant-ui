"use client";

import {
  type ActionButtonElement,
  type ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useAuiState } from "@assistant-ui/store";
import { useSuggestionTrigger as useSuggestionTriggerBehavior } from "@assistant-ui/core/react";

const useSuggestionTrigger = ({
  send,
  clearComposer,
}: {
  /**
   * When true, automatically sends the message.
   * When false, replaces or appends the composer text with the suggestion - depending on the value of `clearComposer`.
   */
  send?: boolean | undefined;

  /**
   * Whether to clear the composer after sending. A send queued while a run is
   * in progress never clears the composer.
   * When send is set to false, determines if composer text is replaced with suggestion (true, default),
   * or if it's appended to the composer text (false).
   *
   * @default true
   */
  clearComposer?: boolean | undefined;
}) => {
  const prompt = useAuiState((s) => s.suggestion.prompt);
  const { trigger, disabled } = useSuggestionTriggerBehavior({
    prompt,
    send,
    clearComposer,
  });

  if (disabled) return null;
  return trigger;
};

export namespace SuggestionPrimitiveTrigger {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useSuggestionTrigger>;
}

/**
 * A button that triggers the suggestion action (send or insert into composer).
 *
 * @example
 * ```tsx
 * <SuggestionPrimitive.Trigger send>
 *   Click me
 * </SuggestionPrimitive.Trigger>
 * ```
 */
export const SuggestionPrimitiveTrigger = createActionButton(
  "SuggestionPrimitive.Trigger",
  useSuggestionTrigger,
  ["send", "clearComposer"],
);
