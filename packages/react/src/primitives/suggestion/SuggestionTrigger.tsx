"use client";

import {
  ActionButtonElement,
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useCallback } from "react";
import { useAuiState, useAui } from "@assistant-ui/store";

const useSuggestionTrigger = ({
  send,
  clearComposer = true,
}: {
  /**
   * When true, automatically sends the message.
   * When false, replaces or appends the composer text with the suggestion - depending on the value of `clearComposer`.
   */
  send?: boolean | undefined;

  /**
   * Whether to clear the composer after sending.
   * When send is set to false, determines if composer text is replaced with suggestion (true, default),
   * or if it's appended to the composer text (false).
   *
   * @default true
   */
  clearComposer?: boolean | undefined;
}) => {
  const aui = useAui();
  const disabled = useAuiState((s) => s.thread.isDisabled);
  const prompt = useAuiState((s) => s.suggestion.prompt);

  const resolvedSend = send ?? false;

  const callback = useCallback(() => {
    const isRunning = aui.thread().getState().isRunning;

    if (resolvedSend && !isRunning) {
      aui.thread().append(prompt);
      if (clearComposer) {
        aui.composer().setText("");
      }
    } else {
      if (clearComposer) {
        aui.composer().setText(prompt);
      } else {
        const currentText = aui.composer().getState().text;
        aui
          .composer()
          .setText(currentText.trim() ? `${currentText} ${prompt}` : prompt);
      }
    }
  }, [aui, resolvedSend, clearComposer, prompt]);

  if (disabled) return null;
  return callback;
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
