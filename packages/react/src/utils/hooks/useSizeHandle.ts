"use client";

import { useCallback } from "react";
import { useManagedRef } from "./useManagedRef";
import type { SizeHandle } from "../../context/stores/ThreadViewport";

/**
 * Hook that creates a ref for tracking element size via a SizeHandle.
 * Reports the height on resize, on `class` or `style` changes, and on window
 * resize.
 *
 * @param register - Function that returns a SizeHandle (e.g., registerContentInset)
 * @param getHeight - Optional function to compute height (defaults to el.offsetHeight)
 * @returns A ref callback to attach to the element
 */
export const useSizeHandle = (
  register: ((measure?: () => number) => SizeHandle) | null | undefined,
  getHeight?: (el: HTMLElement) => number,
) => {
  const callbackRef = useCallback(
    (el: HTMLElement) => {
      if (!register) return;

      const measure = () => (getHeight ? getHeight(el) : el.offsetHeight);
      const sizeHandle = register(measure);

      const updateHeight = () => {
        const height = measure();
        sizeHandle.setHeight(height);
      };

      const ro = new ResizeObserver(updateHeight);
      ro.observe(el);
      // A margin-only change resizes neither box, so ResizeObserver misses it
      const mo = new MutationObserver(updateHeight);
      mo.observe(el, { attributes: true, attributeFilter: ["class", "style"] });
      window.addEventListener("resize", updateHeight);
      updateHeight();

      return () => {
        ro.disconnect();
        mo.disconnect();
        window.removeEventListener("resize", updateHeight);
        sizeHandle.unregister();
      };
    },
    [register, getHeight],
  );

  return useManagedRef(callbackRef);
};
