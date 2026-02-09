"use client";

import { Primitive } from "@radix-ui/react-primitive";
import {
  type ComponentRef,
  type ComponentPropsWithoutRef,
  forwardRef,
  useCallback,
} from "react";
import { useAui, useAuiState } from "@assistant-ui/store";
import { composeEventHandlers } from "@radix-ui/primitive";

// ---- Root ----

export namespace ComposerPrimitiveQuote {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.div>;
}

/**
 * Renders a container for the quoted text preview in the composer.
 * Only renders when a quote is set.
 *
 * @example
 * ```tsx
 * <ComposerPrimitive.Quote>
 *   <ComposerPrimitive.QuoteText />
 *   <ComposerPrimitive.QuoteDismiss>×</ComposerPrimitive.QuoteDismiss>
 * </ComposerPrimitive.Quote>
 * ```
 */
export const ComposerPrimitiveQuote = forwardRef<
  ComposerPrimitiveQuote.Element,
  ComposerPrimitiveQuote.Props
>((props, forwardedRef) => {
  const quote = useAuiState((s) => s.composer.quote);
  if (!quote) return null;

  return <Primitive.div {...props} ref={forwardedRef} />;
});

ComposerPrimitiveQuote.displayName = "ComposerPrimitive.Quote";

// ---- QuoteText ----

export namespace ComposerPrimitiveQuoteText {
  export type Element = ComponentRef<typeof Primitive.span>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.span>;
}

/**
 * Renders the quoted text content.
 *
 * @example
 * ```tsx
 * <ComposerPrimitive.QuoteText />
 * ```
 */
export const ComposerPrimitiveQuoteText = forwardRef<
  ComposerPrimitiveQuoteText.Element,
  ComposerPrimitiveQuoteText.Props
>(({ children, ...props }, forwardedRef) => {
  const text = useAuiState((s) => s.composer.quote?.text);
  if (!text) return null;

  return (
    <Primitive.span {...props} ref={forwardedRef}>
      {children ?? text}
    </Primitive.span>
  );
});

ComposerPrimitiveQuoteText.displayName = "ComposerPrimitive.QuoteText";

// ---- QuoteDismiss ----

export namespace ComposerPrimitiveQuoteDismiss {
  export type Element = ComponentRef<typeof Primitive.button>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.button>;
}

/**
 * A button that clears the current quote from the composer.
 *
 * @example
 * ```tsx
 * <ComposerPrimitive.QuoteDismiss>×</ComposerPrimitive.QuoteDismiss>
 * ```
 */
export const ComposerPrimitiveQuoteDismiss = forwardRef<
  ComposerPrimitiveQuoteDismiss.Element,
  ComposerPrimitiveQuoteDismiss.Props
>(({ onClick, ...props }, forwardedRef) => {
  const aui = useAui();
  const handleDismiss = useCallback(() => {
    aui.composer().setQuote(undefined);
  }, [aui]);

  return (
    <Primitive.button
      type="button"
      {...props}
      ref={forwardedRef}
      onClick={composeEventHandlers(onClick, handleDismiss)}
    />
  );
});

ComposerPrimitiveQuoteDismiss.displayName = "ComposerPrimitive.QuoteDismiss";
