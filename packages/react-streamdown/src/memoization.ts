"use client";

import type { ReactNode } from "react";

type ReactElement = { type: unknown; key: unknown };

function isReactElement(node: unknown): node is ReactElement {
  return (
    typeof node === "object" && node !== null && "type" in node && "key" in node
  );
}

/**
 * Compares two ReactNode values for shallow equality.
 */
function compareNodes(a: ReactNode, b: ReactNode): boolean {
  if (a === b) return true;
  if (!isReactElement(a) || !isReactElement(b)) return false;
  return a.type === b.type && a.key === b.key;
}

/**
 * Memo comparison function for components with children prop.
 * Inspired by react-markdown's approach.
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

  return compareNodes(prev.children, next.children);
}
