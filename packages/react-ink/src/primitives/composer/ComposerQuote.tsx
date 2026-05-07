import type { ComponentProps, ReactNode } from "react";
import { Box } from "ink";
import { useAuiState } from "@assistant-ui/store";

export type ComposerQuoteProps = ComponentProps<typeof Box> & {
  children: ReactNode;
};

export const ComposerQuote = ({
  children,
  ...boxProps
}: ComposerQuoteProps) => {
  const quote = useAuiState((s) => s.composer.quote);
  if (!quote) return null;
  return <Box {...boxProps}>{children}</Box>;
};
