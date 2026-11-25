import { useSuggestionTrigger } from "@assistant-ui/core/react";
import { Pressable, type PressableProps } from "../internal/Pressable";

export type ThreadSuggestionProps = Omit<
  PressableProps,
  "onPress" | "children"
> & {
  children: PressableProps["children"];
  prompt: string;
  metadata?: Record<string, unknown> | undefined;
  send?: boolean | undefined;
  clearComposer?: boolean | undefined;
};

export const ThreadSuggestion = ({
  children,
  prompt,
  metadata,
  send,
  clearComposer = true,
  disabled: disabledProp,
  ...pressableProps
}: ThreadSuggestionProps) => {
  const { trigger, disabled } = useSuggestionTrigger({
    prompt,
    metadata,
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
