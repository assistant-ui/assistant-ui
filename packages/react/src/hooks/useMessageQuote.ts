"use client";

import { useAuiState } from "@assistant-ui/store";
import type { QuoteInfo } from "@assistant-ui/core";

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
  return useAuiState(
    (s) =>
      (s.message.metadata?.custom as Record<string, unknown>)?.quote as
        | QuoteInfo
        | undefined,
  );
};
