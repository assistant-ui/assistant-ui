"use client";

import { useMemo, useRef } from "react";

/**
 * Wraps a callback in a stable identity that always invokes the latest version.
 * Used to keep an entry of the `components` map from changing type on every
 * render, which would remount the subtree it renders.
 *
 * The ref is assigned during render rather than in an effect, as
 * `@radix-ui/react-use-callback-ref` does, because the consumers here are
 * component types rather than event handlers: they run in the same pass that
 * produced the new callback, and an effect would hand them the previous one for
 * that pass with nothing scheduled to correct it.
 */
export function useCallbackRef<T extends (...args: never[]) => unknown>(
  callback: T,
): T {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  return useMemo(() => ((...args) => callbackRef.current(...args)) as T, []);
}
