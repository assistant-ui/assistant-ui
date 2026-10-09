"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

export function useFullscreenOverlay(): {
  expanded: boolean;
  toggle: () => void;
  overlayRef: RefObject<HTMLDivElement | null>;
} {
  const [expanded, setExpanded] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!expanded) return;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    overlayRef.current?.focus();
    // Menus and dialogs close themselves on Escape; the selection toolbar does
    // not, so it only counts as its own layer for focus, not for Escape.
    const isInsideLayer = (target: EventTarget | null, selector: string) => {
      if (!(target instanceof Element)) return false;
      const layer = target.closest(selector);
      return layer !== null && layer !== overlayRef.current;
    };
    const isInsidePopup = (target: EventTarget | null) =>
      isInsideLayer(target, '[role="menu"], [role="dialog"]');
    const isInsideFocusLayer = (target: EventTarget | null) =>
      isInsideLayer(
        target,
        '[role="menu"], [role="dialog"], [data-slot="selection-toolbar"]',
      );
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.key === "Escape") {
        if (isInsidePopup(event.target)) return;
        setExpanded(false);
        return;
      }
      if (event.key !== "Tab") return;
      const root = overlayRef.current;
      if (!root) return;
      if (isInsideFocusLayer(document.activeElement)) return;
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusables.length === 0) {
        event.preventDefault();
        root.focus();
        return;
      }
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      const current = document.activeElement;
      if (!(current instanceof HTMLElement) || !root.contains(current)) {
        event.preventDefault();
        first.focus();
        return;
      }
      if (event.shiftKey && (current === first || current === root)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const onFocusIn = (event: FocusEvent) => {
      const root = overlayRef.current;
      const target = event.target;
      if (!root || !(target instanceof HTMLElement)) return;
      if (root.contains(target) || isInsideFocusLayer(target)) return;
      root.focus();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("focusin", onFocusIn);
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", onFocusIn);
      document.documentElement.style.overflow = "";
      previouslyFocused?.focus();
    };
  }, [expanded]);

  return {
    expanded,
    toggle: () => setExpanded((prev) => !prev),
    overlayRef,
  };
}
