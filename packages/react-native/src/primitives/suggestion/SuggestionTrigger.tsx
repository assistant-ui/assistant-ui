import type { ReactNode } from "react";
import { Pressable, type PressableProps } from "react-native";
import { useAuiState } from "@assistant-ui/store";
import { useSuggestionTrigger } from "@assistant-ui/core/react";

export type SuggestionTriggerProps = Omit<PressableProps, "onPress"> & {
  children: ReactNode;
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

export const SuggestionTrigger = ({
  children,
  send,
  clearComposer = true,
  disabled: disabledProp,
  ...pressableProps
}: SuggestionTriggerProps) => {
  const prompt = useAuiState((s) => s.suggestion.prompt);
  const { trigger, disabled } = useSuggestionTrigger({
    prompt,
    send,
    clearComposer,
  });

  return (
    <Pressable
      onPress={trigger}
      disabled={disabledProp ?? disabled}
      {...pressableProps}
    >
      {children}
    </Pressable>
  );
};
