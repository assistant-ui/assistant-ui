"use client";

import type { QuoteInfo } from "@assistant-ui/core";
import { getMessageQuote } from "@assistant-ui/core/react";
import { useAuiState } from "@assistant-ui/store";

/**
 * Hook that returns the quote info for the current message, if any.
 *
 * Reads from `message.metadata.custom.quote`.
 *
 * @example
 * ```tsx
 * function QuoteBlock() {
 *   const quote = useMessageQuote();
 *   if (!quote) return null;
 *   return <blockquote>{quote.text}</blockquote>;
 * }
 * ```
 */
export const useMessageQuote = (): QuoteInfo | undefined => {
  return useAuiState(getMessageQuote);
};
