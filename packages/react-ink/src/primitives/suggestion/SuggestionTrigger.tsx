import { useAuiState } from "@assistant-ui/store";
import { useSuggestionTrigger } from "@assistant-ui/core/react";
import { Pressable, type PressableProps } from "../internal/Pressable";

export type SuggestionTriggerProps = Omit<
  PressableProps,
  "onPress" | "children"
> & {
  children: PressableProps["children"];
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
  const prompt = useAuiState((s) => s.suggestion.prompt);
  const metadata = useAuiState((s) => s.suggestion.metadata);
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
