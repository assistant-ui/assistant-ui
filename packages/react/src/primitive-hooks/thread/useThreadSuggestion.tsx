import { useCallback } from "react";
import { useThread } from "../../context";
import { useThreadRuntime } from "../../context/react/ThreadContext";

namespace useThreadSuggestion {
  export interface Options {
    prompt: string;
    method: "replace";
    autoSend?: boolean | undefined;
  }
}

export const useThreadSuggestion = ({
  prompt,
  autoSend,
}: useThreadSuggestion.Options) => {
  const threadRuntime = useThreadRuntime();

  const disabled = useThread((t) => t.isDisabled);
  const callback = useCallback(() => {
    if (autoSend && !threadRuntime.getState().isRunning) {
      threadRuntime.append(prompt);
      threadRuntime.composer.setText("");
    } else {
      threadRuntime.composer.setText(prompt);
    }
  }, [threadRuntime, autoSend, prompt]);

  if (disabled) return null;
  return callback;
};
