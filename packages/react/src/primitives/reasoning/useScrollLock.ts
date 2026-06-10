"use client";

import { type RefObject, useCallback, useEffect, useRef } from "react";

/**
 * Locks scroll position during collapsible/height animations and hides scrollbar.
 *
 * This utility prevents page jumps when content height changes during animations,
 * providing a smooth user experience. It finds the nearest scrollable ancestor and
 * temporarily locks its scroll position while the animation completes.
 *
 * - Prevents forced reflows: no layout reads, mutations scoped to scrollable parent only
 * - Reactive: only intercepts scroll events when browser actually adjusts
 * - Cleans up automatically after animation duration
 *
 * @param animatedElementRef - Ref to the animated element
 * @param animationDuration - Lock duration in milliseconds
 * @returns Function to activate the scroll lock
 *
 * @example
 * ```tsx
 * const collapsibleRef = useRef<HTMLDivElement>(null);
 * const lockScroll = useScrollLock(collapsibleRef, 200);
 *
 * const handleCollapse = () => {
 *   lockScroll(); // Lock scroll before collapsing
 *   setIsOpen(false);
 * };
 * ```
 */
export const useScrollLock = <T extends HTMLElement = HTMLElement>(
  animatedElementRef: RefObject<T | null>,
  animationDuration: number,
) => {
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  const lockScroll = useCallback(() => {
    cleanupRef.current?.();

    (function findScrollableAncestor() {
      if (scrollContainerRef.current || !animatedElementRef.current) return;

      let el: HTMLElement | null = animatedElementRef.current;
      while (el) {
        const { overflowY } = getComputedStyle(el);
        if (overflowY === "scroll" || overflowY === "auto") {
          scrollContainerRef.current = el;
          break;
        }
        el = el.parentElement;
      }
    })();

    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const scrollPosition = scrollContainer.scrollTop;
    const scrollbarWidth = scrollContainer.style.scrollbarWidth;

    // Hiding the scrollbar collapses its gutter on classic scrollbars, which
    // shifts centered content horizontally; compensate with padding on the
    // side the scrollbar occupies (the left side in RTL).
    const computed = getComputedStyle(scrollContainer);
    const paddingSide =
      computed.direction === "rtl" ? "paddingLeft" : "paddingRight";
    const previousPadding = scrollContainer.style[paddingSide];
    const scrollbarSize =
      scrollContainer.offsetWidth -
      scrollContainer.clientWidth -
      parseFloat(computed.borderLeftWidth) -
      parseFloat(computed.borderRightWidth);

    scrollContainer.style.scrollbarWidth = "none";
    if (scrollbarSize > 0) {
      scrollContainer.style[paddingSide] = `${
        parseFloat(computed[paddingSide]) + scrollbarSize
      }px`;
    }

    const restoreStyles = () => {
      scrollContainer.style.scrollbarWidth = scrollbarWidth;
      scrollContainer.style[paddingSide] = previousPadding;
    };

    const resetPosition = () => (scrollContainer.scrollTop = scrollPosition);
    scrollContainer.addEventListener("scroll", resetPosition);

    const timeoutId = setTimeout(() => {
      scrollContainer.removeEventListener("scroll", resetPosition);
      restoreStyles();
      cleanupRef.current = null;
    }, animationDuration);

    cleanupRef.current = () => {
      clearTimeout(timeoutId);
      scrollContainer.removeEventListener("scroll", resetPosition);
      restoreStyles();
    };
  }, [animationDuration, animatedElementRef]);

  return lockScroll;
};
