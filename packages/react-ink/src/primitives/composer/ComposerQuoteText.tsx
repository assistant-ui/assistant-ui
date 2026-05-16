import type { ComponentProps, ReactNode } from "react";
import { Text } from "ink";
import { useAuiState } from "@assistant-ui/store";

export type ComposerQuoteTextProps = ComponentProps<typeof Text> & {
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
