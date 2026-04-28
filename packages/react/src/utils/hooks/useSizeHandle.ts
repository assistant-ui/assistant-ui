"use client";

import { useCallback } from "react";
import { useManagedRef } from "./useManagedRef";
import type { SizeHandle } from "../../context/stores/ThreadViewport";

/**
 * Hook that creates a ref for tracking element size via a SizeHandle.
 * Automatically sets up ResizeObserver and reports height changes.
 *
 * @param register - Function that returns a SizeHandle (e.g., registerContentInset)
 * @param getHeight - Optional function to compute height (defaults to el.offsetHeight)
 * @returns A ref callback to attach to the element
 */
export const useSizeHandle = (
  register: (() => SizeHandle) | null | undefined,
  getHeight?: (el: HTMLElement) => number,
) => {
  const callbackRef = useCallback(
    (el: HTMLElement) => {
      if (!register) return;

      const sizeHandle = register();

      const updateHeight = () => {
        const height = getHeight ? getHeight(el) : el.offsetHeight;
        sizeHandle.setHeight(height);
      };

      const ro = new ResizeObserver(updateHeight);
      ro.observe(el);
      updateHeight();

      return () => {
        ro.disconnect();
        sizeHandle.unregister();
      };
    },
    [register, getHeight],
  );

  return useManagedRef(callbackRef);
};
