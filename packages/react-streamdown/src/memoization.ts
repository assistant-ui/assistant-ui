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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/**
 * Compares arrays and plain objects by value down to `depth` levels, and
 * anything below that depth or of another kind by identity.
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

  if (isPlainObject(a) && isPlainObject(b)) {
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

/**
 * Compares parsed hast, which streamdown re-creates on every parse: children
 * recursively, `properties`, `position` and `data` one array or object level
 * deep, and any other field by identity, so plugin values nested deeper compare
 * as changed without being walked.
 */
export function isSameHastNode(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (!isPlainObject(a) || !isPlainObject(b)) return false;
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length &&
    keys.every((key) => {
      if (!Object.hasOwn(b, key)) return false;
      const prev = a[key];
      const next = b[key];
      if (key === "children" && Array.isArray(prev) && Array.isArray(next)) {
        return (
          prev.length === next.length &&
          prev.every((child, index) => isSameHastNode(child, next[index]))
        );
      }
      if (key === "properties" || key === "position" || key === "data") {
        return isEqualToDepth(prev, next, 2);
      }
      return Object.is(prev, next);
    })
  );
}
