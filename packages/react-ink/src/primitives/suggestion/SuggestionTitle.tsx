import type { ComponentProps, ReactNode } from "react";
import { Text } from "ink";
import { useAuiState } from "@assistant-ui/store";

export type SuggestionTitleProps = ComponentProps<typeof Text> & {
  children?: ReactNode;
};

export const SuggestionTitle = ({
  children,
  ...textProps
}: SuggestionTitleProps) => {
  const title = useAuiState((s) => s.suggestion.title);

  return <Text {...textProps}>{children ?? title}</Text>;
};
