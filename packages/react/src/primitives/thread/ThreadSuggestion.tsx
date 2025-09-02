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
  const api = useAssistantApi();
  const disabled = useAssistantState(({ thread }) => thread.isDisabled);

  const callback = useCallback(() => {
    const isRunning = api.thread().getState().isRunning;
    if (autoSend && !isRunning) {
      api.thread().append(prompt);
    } else {
      api.composer().setText(prompt);
    }
  }, [api, autoSend, prompt]);

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
