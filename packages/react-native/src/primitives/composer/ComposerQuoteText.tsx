import type { ReactNode } from "react";
import { Text, type TextProps } from "react-native";
import { useAuiState } from "@assistant-ui/store";

export type ComposerQuoteTextProps = TextProps & {
  children?: ReactNode;
};

export const ComposerQuoteText = ({
  children,
  ...textProps
}: ComposerQuoteTextProps) => {
  const text = useAuiState((s) => s.composer.quote?.text);
  if (text === undefined) return null;

  return <Text {...textProps}>{children ?? text}</Text>;
};
