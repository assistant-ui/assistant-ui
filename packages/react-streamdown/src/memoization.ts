"use client";

import type { ReactNode } from "react";

type ReactElement = {
  type: unknown;
  key: unknown;
  props: { children?: ReactNode; [key: string]: unknown };
};

function isReactElement(node: unknown): node is ReactElement {
  return (
    typeof node === "object" &&
    node !== null &&
    "type" in node &&
    "key" in node &&
    "props" in node &&
    typeof node.props === "object" &&
    node.props !== null
  );
}

/**
 * Compares two ReactNode values for shallow equality.
 */
function compareNodes(a: ReactNode, b: ReactNode): boolean {
  if (a === b) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
      return false;
    }
    return a.every((node, index) => compareNodes(node, b[index]));
  }
  if (!isReactElement(a) || !isReactElement(b)) return false;
  return (
    a.type === b.type && a.key === b.key && memoCompareNodes(a.props, b.props)
  );
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
