"use client";
import { MutableRefObject, useLayoutEffect, useRef } from "react";

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
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            resizeObserver.observe(node as Element);
          }
        });

        mutation.removedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            resizeObserver.unobserve(node);
          }
        });
      });

      callbackRef.current();
    });

    mutationObserver.observe(el, { childList: true });
    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, []);
};
