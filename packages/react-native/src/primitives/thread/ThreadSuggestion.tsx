import type { ReactNode } from "react";
import { Pressable, type PressableProps } from "react-native";
import { useSuggestionTrigger } from "@assistant-ui/core/react";

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
