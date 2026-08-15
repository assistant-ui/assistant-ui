import { useCallback } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";
import { suggestionTriggerDisabled } from "../../store/primitive-predicates";

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
  const resolvedSend = send ?? false;
  const disabled = useAuiState((s) =>
    suggestionTriggerDisabled(s, resolvedSend),
  );

  const trigger = useCallback(() => {
    if (resolvedSend) {
      const { isRunning, capabilities } = aui.thread.getState();
      if (isRunning && !capabilities.queue) return;

      aui.thread.append({
        content: [{ type: "text", text: prompt }],
        runConfig: aui.composer.getState().runConfig,
      });
      // A queued send must not clear the draft the user is still composing.
      if (clearComposer && !isRunning) {
        aui.composer.setText("");
      }
    } else {
      if (clearComposer) {
        aui.composer.setText(prompt);
      } else {
        const currentText = aui.composer.getState().text;
        aui.composer.setText(
          [currentText, prompt].filter((part) => part.trim()).join(" "),
        );
      }
    }
  }, [aui, resolvedSend, clearComposer, prompt]);

  return { trigger, disabled };
};
