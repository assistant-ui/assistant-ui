"use client";

import { useRef, type ComponentProps } from "react";
import { useIsomorphicLayoutEffect } from "../utils/useIsomorphicLayoutEffect";

type FocusHandlers = Pick<
  ComponentProps<"div">,
  "onFocusCapture" | "onBlurCapture"
>;

export function useReceiptFocus<T extends HTMLElement = HTMLElement>(
  handlers: FocusHandlers = {},
) {
  const focusedElementRef = useRef<HTMLElement | null>(null);
  const receiptRef = useRef<T | null>(null);

  useIsomorphicLayoutEffect(() => {
    const focusedElement = focusedElementRef.current;
    if (
      focusedElement &&
      !focusedElement.isConnected &&
      focusedElement.ownerDocument.activeElement ===
        focusedElement.ownerDocument.body
    ) {
      focusedElementRef.current = null;
      receiptRef.current?.focus({ preventScroll: true });
    }
  });

  return {
    receiptRef,
    focusHandlers: {
      onFocusCapture: (event) => {
        handlers.onFocusCapture?.(event);
        focusedElementRef.current = event.target as HTMLElement;
      },
      onBlurCapture: (event) => {
        handlers.onBlurCapture?.(event);
        if (
          event.target.isConnected &&
          !event.currentTarget.contains(
            event.relatedTarget ??
              event.currentTarget.ownerDocument.activeElement,
          )
        ) {
          focusedElementRef.current = null;
        }
      },
    } satisfies FocusHandlers,
  };
}
