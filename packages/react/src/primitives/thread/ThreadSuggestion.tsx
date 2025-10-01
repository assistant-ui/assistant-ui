"use client";

import {
  ActionButtonElement,
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useCallback } from "react";
import { useAssistantState, useAssistantApi } from "../../context";

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
  const api = useAssistantApi();
  const disabled = useAssistantState(({ thread }) => thread.isDisabled);

  // ========== Deprecation Mapping ==========
  const resolvedSend = send ?? autoSend ?? false;
  // ==========================================

  const callback = useCallback(() => {
    const isRunning = api.thread().getState().isRunning;

    if (resolvedSend && !isRunning) {
      api.thread().append(prompt);
      if (clearComposer) {
        api.composer().setText("");
      }
    } else {
      if (clearComposer) {
        api.composer().setText(prompt);
      } else {
        const currentText = api.composer().getState().text;
        api
          .composer()
          .setText(currentText.trim() ? `${currentText} ${prompt}` : prompt);
      }
    }
  }, [api, resolvedSend, clearComposer, prompt]);

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
