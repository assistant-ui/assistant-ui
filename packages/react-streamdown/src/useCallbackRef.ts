"use client";

import { useEffect, useMemo, useRef } from "react";

/**
 * Wraps a callback in a stable identity that always invokes the latest version.
 * Used to keep a component entry of the `components` map from changing type on
 * every render; the wrapped callback is swapped after commit, so a render that
 * consumes a just-changed callback still sees the previous one.
 */
export function useCallbackRef<T extends (...args: never[]) => unknown>(
  callback: T,
): T {
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  });
  return useMemo(() => ((...args) => callbackRef.current(...args)) as T, []);
}
