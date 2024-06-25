import { useCallback } from "react";
import { useThreadContext } from "../../context";

type UseApplyThreadSuggestionProps = {
  prompt: string;
  method: "replace";
  autoSend?: boolean;
};

export const useThreadSuggestion = ({
  prompt,
  autoSend,
}: UseApplyThreadSuggestionProps) => {
  const { useThread, useComposer } = useThreadContext();

  const disabled = useThread((t) => t.isRunning);
  const callback = useCallback(() => {
    const thread = useThread.getState();
    const composer = useComposer.getState();
    composer.setValue(prompt);

    if (autoSend && !thread.isRunning) {
      composer.send();
    }
  }, [useThread, useComposer, prompt, autoSend]);

  if (disabled) return null;
  return callback;
};
