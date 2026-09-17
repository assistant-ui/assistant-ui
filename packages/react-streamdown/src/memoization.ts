"use client";

import type { ReactNode } from "react";

/**
 * Compares props with strict equality, including child element identity.
 */
export function memoCompareNodes<
  T extends { children?: ReactNode; [key: string]: unknown },
>(prev: Readonly<T>, next: Readonly<T>): boolean {
  const prevKeys = Object.keys(prev).filter((k) => k !== "children");
  const nextKeys = Object.keys(next).filter((k) => k !== "children");

  if (prevKeys.length !== nextKeys.length) return false;
  for (const key of prevKeys) {
    if (prev[key] !== next[key]) return false;
  }

  return prev.children === next.children;
}

/**
 * Compares arrays and plain objects by value down to `depth` levels, and
 * anything below that depth by identity.
 */
export function isEqualToDepth(a: unknown, b: unknown, depth: number): boolean {
  if (Object.is(a, b)) return true;
  if (depth <= 0) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!isEqualToDepth(a[i], b[i], depth - 1)) return false;
    }
    return true;
  }

  const plain = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

  if (plain(a) && plain(b)) {
    const keys = Object.keys(a);
    return (
      keys.length === Object.keys(b).length &&
      keys.every(
        (key) =>
          Object.hasOwn(b, key) && isEqualToDepth(a[key], b[key], depth - 1),
      )
    );
  }

  return false;
}
