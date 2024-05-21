"use client";
import { type MutableRefObject, useLayoutEffect, useRef } from "react";

export const useOnResizeContent = (
  ref: MutableRefObject<HTMLElement | null>,
  callback: () => void,
) => {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const resizeObserver = new ResizeObserver(() => {
      callbackRef.current();
    });

    const mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof Element) {
            resizeObserver.observe(node);
          }
        }

        for (const node of mutation.removedNodes) {
          if (node instanceof Element) {
            resizeObserver.unobserve(node);
          }
        }
      }

      callbackRef.current();
    });

    resizeObserver.observe(el);
    mutationObserver.observe(el, { childList: true });

    // Observe existing children
    for (const child of el.children) {
      resizeObserver.observe(child);
    }

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [ref.current]);
};
