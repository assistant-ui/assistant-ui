import { flushTapSync } from "@assistant-ui/tap";
import {
  suggestionSendMode,
  suggestionTriggerDisabled,
} from "@assistant-ui/core/store/internal";
import { getAuiContext } from "../context";
import { useAuiState } from "../useAuiState";

/**
 * Builder for a suggestion button. Spread `props` onto a `<button>`. Iterate
 * `s.suggestions.suggestions` and address the suggestion by `index`. With
 * `send`, the prompt is appended as a message (queued sends never clear a
 * draft the user is still composing); without it, the prompt replaces the
 * composer text, or is appended to it when `clearComposer` is false. Caller
 * handlers compose the same way as `composerSend`. Call during component
 * initialization. `index` is captured at construction, so iterate with an
 * unkeyed `{#each}` the way `threadMessages` documents.
 */
export const suggestionTrigger = (options: {
  index: number;
  send?: boolean | undefined;
  clearComposer?: boolean | undefined;
}) => {
  const { index, send = false, clearComposer = true } = options;
  const { aui } = getAuiContext();
  const disabled = useAuiState((s) => suggestionTriggerDisabled(s, send));

  return {
    props: {
      type: "button" as const,
      get disabled() {
        return disabled.current;
      },
      onclick: (event?: MouseEvent) => {
        if (event?.defaultPrevented || disabled.current) return;
        const prompt = aui.suggestions.getState().suggestions[index]?.prompt;
        if (prompt === undefined) return;
        flushTapSync(() => {
          if (send) {
            const mode = suggestionSendMode(aui.thread.getState());
            if (mode === "blocked") return;
            aui.thread.append({
              content: [{ type: "text", text: prompt }],
              runConfig: aui.composer.getState().runConfig,
            });
            if (clearComposer && mode === "now") {
              aui.composer.setText("");
            }
          } else if (clearComposer) {
            aui.composer.setText(prompt);
          } else {
            const currentText = aui.composer.getState().text;
            aui.composer.setText(
              [currentText, prompt].filter((part) => part.trim()).join(" "),
            );
          }
        });
      },
    },
  };
};
