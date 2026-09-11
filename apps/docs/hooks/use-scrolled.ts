"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("scroll", onStoreChange, { passive: true });
  return () => window.removeEventListener("scroll", onStoreChange);
}

/**
 * Popup scroll locks (Base UI, Radix) clamp the document and make
 * window.scrollY read 0 while the page visually stays in place. Freeze the
 * last real value while a lock is active so sticky chrome does not lose its
 * scrolled treatment when a select, menu, or dialog opens.
 */
function isScrollLocked() {
  const body = document.body.style;
  const html = document.documentElement.style;
  return (
    body.overflow === "hidden" ||
    body.position === "fixed" ||
    html.overflow.includes("hidden")
  );
}

export function useScrolled(threshold = 0) {
  const last = useRef(false);
  const getSnapshot = useCallback(() => {
    if (isScrollLocked()) return last.current;
    last.current = window.scrollY > threshold;
    return last.current;
  }, [threshold]);
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
