import { useCallback } from "react";
import { useThreadContext } from "../../context";
import { useAppendMessage } from "../../hooks";

export type UseApplyThreadSuggestionProps = {
  prompt: string;
  method: "replace";
  autoSend?: boolean | undefined;
};

export const useThreadSuggestion = ({
  prompt,
  autoSend,
}: UseApplyThreadSuggestionProps) => {
  const { useThread, useComposer } = useThreadContext();

  const append = useAppendMessage();
  const disabled = useThread((t) => t.isRunning);
  const callback = useCallback(() => {
    const thread = useThread.getState();
    const composer = useComposer.getState();
    if (autoSend && !thread.isRunning) {
      append(prompt);
      composer.setValue("");
    } else {
      composer.setValue(prompt);
    }
  }, [useThread, useComposer, autoSend, append, prompt]);

  if (disabled) return null;
  return callback;
};
