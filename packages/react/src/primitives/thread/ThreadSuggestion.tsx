"use client";

import {
  ActionButtonElement,
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useCallback } from "react";
import { useAuiState, useAui } from "@assistant-ui/store";

const useThreadSuggestion = ({
  prompt,
  send,
  clearComposer = true,
  autoSend,
  method: _method,
}: {
  /** The suggestion prompt. */
  prompt: string;

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

  /** @deprecated Use `send` instead. */
  autoSend?: boolean | undefined;

  /** @deprecated Use `clearComposer` instead. */
  method?: "replace";
}) => {
  const aui = useAui();
  const disabled = useAuiState((s) => s.thread.isDisabled);

  // ========== Deprecation Mapping ==========
  const resolvedSend = send ?? autoSend ?? false;
  // ==========================================

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

export namespace ThreadPrimitiveSuggestion {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useThreadSuggestion>;
}

export const ThreadPrimitiveSuggestion = createActionButton(
  "ThreadPrimitive.Suggestion",
  useThreadSuggestion,
  ["prompt", "send", "clearComposer", "autoSend", "method"],
);
