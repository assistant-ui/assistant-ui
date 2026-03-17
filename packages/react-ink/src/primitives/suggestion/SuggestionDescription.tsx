import type { ComponentProps, ReactNode } from "react";
import { Text } from "ink";
import { useAuiState } from "@assistant-ui/store";

export type SuggestionDescriptionProps = ComponentProps<typeof Text> & {
  children?: ReactNode;
};

export const SuggestionDescription = ({
  children,
  ...textProps
}: SuggestionDescriptionProps) => {
  const label = useAuiState((s) => s.suggestion.label);

  return <Text {...textProps}>{children ?? label}</Text>;
};
