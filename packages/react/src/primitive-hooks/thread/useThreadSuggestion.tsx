import { useCallback } from "react";
import { useThread, useThreadStore } from "../../context";
import { useAppendMessage } from "../../hooks";
import { useThreadComposerStore } from "../../context/react/ThreadContext";

export type UseApplyThreadSuggestionProps = {
  prompt: string;
  method: "replace";
  autoSend?: boolean | undefined;
};

export const useThreadSuggestion = ({
  prompt,
  autoSend,
}: UseApplyThreadSuggestionProps) => {
  const threadStore = useThreadStore();
  const composerStore = useThreadComposerStore();

  const append = useAppendMessage();
  const disabled = useThread((t) => t.isDisabled);
  const callback = useCallback(() => {
    const thread = threadStore.getState();
    const composer = composerStore.getState();
    if (autoSend && !thread.isRunning) {
      append(prompt);
      composer.setText("");
    } else {
      composer.setText(prompt);
    }
  }, [threadStore, composerStore, autoSend, append, prompt]);

  if (disabled) return null;
  return callback;
};
