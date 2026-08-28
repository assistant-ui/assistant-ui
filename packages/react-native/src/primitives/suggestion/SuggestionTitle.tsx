import type { ReactNode } from "react";
import { Text, type TextProps } from "react-native";
import { useAuiState } from "@assistant-ui/store";

export type SuggestionTitleProps = TextProps & {
  children?: ReactNode;
};

export const SuggestionTitle = ({
  children,
  ...textProps
}: SuggestionTitleProps) => {
  const title = useAuiState("suggestion", (s) => s.title);

  return <Text {...textProps}>{children ?? title}</Text>;
};
