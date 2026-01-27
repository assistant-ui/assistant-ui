"use client";

import type { ReactNode } from "react";

/**
 * Compares two ReactNode values for shallow equality.
 * Used for memoizing components that receive children.
 */
function compareNodes(a: ReactNode, b: ReactNode): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object" || typeof b !== "object") return false;
  if (a === null || b === null) return false;

  // For React elements, compare type and key
  if ("type" in a && "type" in b) {
    const aElement = a as { type: unknown; key: unknown };
    const bElement = b as { type: unknown; key: unknown };
    return aElement.type === bElement.type && aElement.key === bElement.key;
  }

  return false;
}

/**
 * Memo comparison function for components with children prop.
 * Inspired by react-markdown's approach.
 */
export function memoCompareNodes<
  T extends { children?: ReactNode; [key: string]: unknown },
>(prev: Readonly<T>, next: Readonly<T>): boolean {
  // Compare all props except children
  const prevKeys = Object.keys(prev).filter((k) => k !== "children");
  const nextKeys = Object.keys(next).filter((k) => k !== "children");

  if (prevKeys.length !== nextKeys.length) return false;

  for (const key of prevKeys) {
    if (prev[key] !== next[key]) return false;
  }

  // Compare children using node comparison
  return compareNodes(prev.children, next.children);
}
