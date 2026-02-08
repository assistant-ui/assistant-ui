"use client";

import { Primitive } from "@radix-ui/react-primitive";
import { composeEventHandlers } from "@radix-ui/primitive";
import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  forwardRef,
  useCallback,
} from "react";
import { useAui } from "@assistant-ui/store";
import { useSelectionToolbarInfo } from "./SelectionToolbarRoot";

export namespace SelectionToolbarPrimitiveQuote {
  export type Element = ComponentRef<typeof Primitive.button>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.button>;
}

/**
 * A button that quotes the currently selected text.
 *
 * Must be placed inside `SelectionToolbarPrimitive.Root`. Reads the
 * selection info from context (captured by the Root), sets it as a
 * quote in the thread composer, and clears the selection.
 *
 * @example
 * ```tsx
 * <SelectionToolbarPrimitive.Quote>
 *   <QuoteIcon /> Quote
 * </SelectionToolbarPrimitive.Quote>
 * ```
 */
export const SelectionToolbarPrimitiveQuote = forwardRef<
  SelectionToolbarPrimitiveQuote.Element,
  SelectionToolbarPrimitiveQuote.Props
>(({ onClick, disabled, ...props }, ref) => {
  const aui = useAui();
  const info = useSelectionToolbarInfo();

  const handleClick = useCallback(() => {
    if (!info) return;

    aui.thread().composer.setQuote({
      text: info.text,
      messageId: info.messageId,
    });

    window.getSelection()?.removeAllRanges();
  }, [aui, info]);

  return (
    <Primitive.button
      type="button"
      {...props}
      ref={ref}
      disabled={disabled || !info}
      onClick={composeEventHandlers(onClick, handleClick)}
    />
  );
});

SelectionToolbarPrimitiveQuote.displayName = "SelectionToolbarPrimitive.Quote";
