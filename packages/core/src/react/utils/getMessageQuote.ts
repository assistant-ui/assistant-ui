import type { QuoteInfo } from "../../types";

type MessageQuoteState = {
  message: {
    metadata?: unknown;
  };
};

export const getMessageQuote = (
  state: MessageQuoteState,
): QuoteInfo | undefined => {
  const metadata = state.message.metadata;
  if (!metadata || typeof metadata !== "object") return undefined;

  return (metadata as { custom?: Record<string, unknown> }).custom?.quote as
    | QuoteInfo
    | undefined;
};
