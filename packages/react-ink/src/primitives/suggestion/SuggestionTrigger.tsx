import { useCallback, type ReactNode } from "react";
import { useAuiState, useAui } from "@assistant-ui/store";
import { Pressable, type PressableProps } from "../internal/Pressable";

export type SuggestionTriggerProps = Omit<PressableProps, "onPress"> & {
  children: ReactNode;
  send?: boolean | undefined;
  clearComposer?: boolean | undefined;
};

export const SuggestionTrigger = ({
  children,
  send,
  clearComposer = true,
  disabled: disabledProp,
  ...pressableProps
}: SuggestionTriggerProps) => {
  const aui = useAui();
  const isDisabled = useAuiState((s) => s.thread.isDisabled);
  const prompt = useAuiState((s) => s.suggestion.prompt);
  const resolvedSend = send ?? false;

  const onPress = useCallback(() => {
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

  return (
    <Pressable
      onPress={onPress}
      disabled={disabledProp ?? isDisabled}
      {...pressableProps}
    >
      {children}
    </Pressable>
  );
};
