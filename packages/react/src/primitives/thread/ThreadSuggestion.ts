"use client";

import {
  type ActionButtonElement,
  type ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useSuggestionTrigger as useSuggestionTriggerBehavior } from "@assistant-ui/core/react";

const useThreadSuggestion = ({
  prompt,
  send,
  clearComposer,
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
  const resolvedSend = send ?? autoSend ?? false;

  const { disabled, trigger } = useSuggestionTriggerBehavior({
    prompt,
    send: resolvedSend,
    clearComposer,
  });
  if (disabled) return null;
  return trigger;
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
