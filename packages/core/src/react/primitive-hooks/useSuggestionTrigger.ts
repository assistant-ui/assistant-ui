import { useCallback } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";
import {
  suggestionSendMode,
  suggestionTriggerDisabled,
} from "../../store/primitive-predicates";

export type UseSuggestionTriggerOptions = {
  prompt: string;
  /** Set as `metadata.custom` on the message a send appends. */
  metadata?: Record<string, unknown> | undefined;
  send?: boolean | undefined;
  clearComposer?: boolean | undefined;
};

export const useSuggestionTrigger = ({
  prompt,
  metadata,
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
      const mode = suggestionSendMode(aui.thread.getState());
      if (mode === "blocked") return;

      aui.thread.append({
        content: [{ type: "text", text: prompt }],
        runConfig: aui.composer.getState().runConfig,
        ...(metadata !== undefined && { metadata: { custom: metadata } }),
      });
      // A queued send must not clear the draft the user is still composing.
      if (clearComposer && mode === "now") {
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
  }, [aui, resolvedSend, clearComposer, prompt, metadata]);

  return { trigger, disabled };
};
