import type { ReactNode } from "react";
import { useSuggestionTrigger } from "@assistant-ui/core/react";
import { Pressable, type PressableProps } from "../internal/Pressable";

export type ThreadSuggestionProps = Omit<PressableProps, "onPress"> & {
  children: ReactNode;
  prompt: string;
  send?: boolean | undefined;
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
