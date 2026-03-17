import { type FC, type ReactNode, memo } from "react";
import { useAuiState } from "@assistant-ui/store";
import { getMessageQuote } from "../../utils/getMessageQuote";
import type { QuoteInfo } from "../../../types/quote";

export namespace MessagePrimitiveQuote {
  export type Props = {
    /** Render function called when a quote is present. Receives quote info. */
    children: (value: QuoteInfo) => ReactNode;
  };
}

/**
 * Renders a quote block if the message has quote metadata.
 * Place this above `MessagePrimitive.Parts` in your message layout.
 *
 * @example
 * ```tsx
 * <MessagePrimitive.Quote>
 *   {({ text, messageId }) => <QuoteBlock text={text} messageId={messageId} />}
 * </MessagePrimitive.Quote>
 * <MessagePrimitive.Parts>
 *   {({ part }) => { ... }}
 * </MessagePrimitive.Parts>
 * ```
 */
const MessagePrimitiveQuoteImpl: FC<MessagePrimitiveQuote.Props> = ({
  children,
}) => {
  const quoteInfo = useAuiState(getMessageQuote);
  if (!quoteInfo) return null;
  return <>{children(quoteInfo)}</>;
};

export const MessagePrimitiveQuote = memo(MessagePrimitiveQuoteImpl);

MessagePrimitiveQuote.displayName = "MessagePrimitive.Quote";
