"use client";

import { type RefObject, useRef } from "react";

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

  const lockScroll = () => {
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

    scrollContainer.style.scrollbarWidth = "none";

    const resetPosition = () => (scrollContainer.scrollTop = scrollPosition);
    scrollContainer.addEventListener("scroll", resetPosition);

    setTimeout(() => {
      scrollContainer.removeEventListener("scroll", resetPosition);
      scrollContainer.style.scrollbarWidth = scrollbarWidth;
    }, animationDuration);
  };

  return lockScroll;
};
