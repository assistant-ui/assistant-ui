"use client";

import { useRef } from "react";

const shallowEqual = (a: unknown, b: unknown): boolean => {
  if (Object.is(a, b)) return true;
  if (
    typeof a !== "object" ||
    typeof b !== "object" ||
    a === null ||
    b === null
  )
    return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (
      !Object.is(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key],
      )
    )
      return false;
  }

  return true;
};

/**
 * Wraps a selector function to use shallow equality comparison,
 * preventing unnecessary re-renders when the selector returns a new
 * object with the same values.
 *
 * @param selector - The selector function to wrap
 * @returns A memoized selector that returns the previous result if shallow-equal
 *
 * @example
 * ```typescript
 * // Without useShallow - re-renders on every state change (BAD)
 * const { text, isEditing } = useAuiState((s) => ({
 *   text: s.composer.text,
 *   isEditing: s.composer.isEditing,
 * }));
 *
 * // With useShallow - only re-renders when values change (GOOD)
 * const { text, isEditing } = useAuiState(
 *   useShallow((s) => ({
 *     text: s.composer.text,
 *     isEditing: s.composer.isEditing,
 *   })),
 * );
 *
 * // Alternative: split into multiple calls (also GOOD)
 * const text = useAuiState((s) => s.composer.text);
 * const isEditing = useAuiState((s) => s.composer.isEditing);
 * ```
 */
export const useShallow = <S, T>(
  selector: (state: S) => T,
): ((state: S) => T) => {
  const prev = useRef<T | undefined>(undefined);

  return (state: S) => {
    const next = selector(state);
    if (shallowEqual(prev.current, next)) {
      return prev.current as T;
    }
    prev.current = next;
    return next;
  };
};
