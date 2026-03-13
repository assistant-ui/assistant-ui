import { useCallback } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";

export type UseSuggestionTriggerOptions = {
  prompt: string;
  send?: boolean | undefined;
  clearComposer?: boolean | undefined;
};

export const useSuggestionTrigger = ({
  prompt,
  send,
  clearComposer = true,
}: UseSuggestionTriggerOptions) => {
  const aui = useAui();
  const disabled = useAuiState((s) => s.thread.isDisabled);
  const resolvedSend = send ?? false;

  const trigger = useCallback(() => {
    const isRunning = aui.thread().getState().isRunning;

    if (resolvedSend && !isRunning) {
      aui.thread().append({
        content: [{ type: "text", text: prompt }],
        runConfig: aui.composer().getState().runConfig,
      });
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

  return { trigger, disabled };
};
