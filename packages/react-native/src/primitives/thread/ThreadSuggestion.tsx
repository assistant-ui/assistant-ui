import { useCallback, type ReactNode } from "react";
import { Pressable, type PressableProps } from "react-native";
import { useAuiState, useAui } from "@assistant-ui/store";

export type ThreadSuggestionProps = Omit<PressableProps, "onPress"> & {
  children: ReactNode;
  /** The suggestion prompt. */
  prompt: string;
  /**
   * When true, automatically sends the message.
   * When false, replaces or appends the composer text with the suggestion.
   */
  send?: boolean | undefined;
  /**
   * Whether to clear the composer. When send is false, determines if composer
   * text is replaced (true) or appended (false).
   * @default true
   */
  clearComposer?: boolean | undefined;
};

export const ThreadSuggestion = ({
  children,
  prompt,
  send,
  clearComposer = true,
  disabled: disabledProp,
  ...pressableProps
}: ThreadSuggestionProps) => {
  const aui = useAui();
  const isDisabled = useAuiState((s) => s.thread.isDisabled);
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
