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
  autoSend,
}: {
  prompt: string;
  method?: "replace";
  autoSend?: boolean | undefined;
}) => {
  const { actions, getState } = useAssistantApi();
  const disabled = useAssistantState(({ thread }) => thread.isDisabled);

  const callback = useCallback(() => {
    const isRunning = getState().thread.isRunning;
    if (autoSend && !isRunning) {
      actions.thread.append(prompt);
    } else {
      actions.composer.setText(prompt);
    }
  }, [actions, getState, autoSend, prompt]);

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
  ["prompt", "autoSend", "method"],
);
