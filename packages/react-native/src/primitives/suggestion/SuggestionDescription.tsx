import type { ReactNode } from "react";
import { Text, type TextProps } from "react-native";
import { useAuiState } from "@assistant-ui/store";

export type SuggestionDescriptionProps = TextProps & {
  children?: ReactNode;
};

export const SuggestionDescription = ({
  children,
  ...textProps
}: SuggestionDescriptionProps) => {
  const label = useAuiState((s) => s.suggestion.label);

  return <Text {...textProps}>{children ?? label}</Text>;
};
