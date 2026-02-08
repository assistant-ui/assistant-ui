"use client";

import { forwardRef, useCallback } from "react";
import { Primitive } from "@radix-ui/react-primitive";
import { composeEventHandlers } from "@radix-ui/primitive";
import { useAui, useAuiState } from "@assistant-ui/store";
import type { ActionButtonProps } from "../../utils/createActionButton";
import { getSelectionMessageId } from "../../utils/getSelectionMessageId";

const useActionBarQuote = () => {
  const aui = useAui();
  const hasQuotableContent = useAuiState((s) => {
    return (
      s.message.status?.type !== "running" &&
      s.message.parts.some((c) => c.type === "text" && c.text.length > 0)
    );
  });

  const callback = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const text = selection.toString().trim();
    if (!text) return;

    const messageId = getSelectionMessageId(selection);
    if (!messageId) return;

    aui.thread().composer.setQuote({ text, messageId });
    selection.removeAllRanges();
  }, [aui]);

  if (!hasQuotableContent) return null;
  return callback;
};

export namespace ActionBarPrimitiveQuote {
  export type Element = HTMLButtonElement;
  export type Props = ActionButtonProps<typeof useActionBarQuote>;
}

/**
 * A button component that quotes selected text from a message.
 *
 * When clicked, captures the current text selection within the message,
 * sets it as a quote in the composer, and clears the selection.
 * Disabled when the message has no text content or is still streaming.
 *
 * @example
 * ```tsx
 * <ActionBarPrimitive.Quote>
 *   Quote
 * </ActionBarPrimitive.Quote>
 * ```
 */
export const ActionBarPrimitiveQuote = forwardRef<
  ActionBarPrimitiveQuote.Element,
  ActionBarPrimitiveQuote.Props
>(({ onClick, disabled, ...props }, forwardedRef) => {
  const callback = useActionBarQuote();
  return (
    <Primitive.button
      type="button"
      {...props}
      ref={forwardedRef}
      disabled={disabled || !callback}
      onClick={composeEventHandlers(onClick, () => {
        callback?.();
      })}
    />
  );
});

ActionBarPrimitiveQuote.displayName = "ActionBarPrimitive.Quote";
