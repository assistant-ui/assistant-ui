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

function isPlainArray(value: unknown): value is unknown[] {
  if (
    !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype ||
    Reflect.ownKeys(value).length !== value.length + 1
  ) {
    return false;
  }
  for (let i = 0; i < value.length; i++) {
    if (!Object.prototype.propertyIsEnumerable.call(value, i)) return false;
  }
  return true;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) return false;
  const prototype = Object.getPrototypeOf(value);
  return (
    (prototype === Object.prototype || prototype === null) &&
    Reflect.ownKeys(value).length === Object.keys(value).length
  );
}

const MAX_COMPARISONS = 10_000;

/**
 * Compares JSON shaped arrays and objects by value down to `depth` levels, and
 * anything below that depth or of another kind, including values with symbol
 * keys or non-enumerable properties, by identity. A comparison that needs more
 * than 10,000 steps, such as one wide object reached from many keys, reports a
 * change instead of finishing.
 */
export function isEqualToDepth(a: unknown, b: unknown, depth: number): boolean {
  let comparisons = 0;
  const isEqual = (prev: unknown, next: unknown, level: number): boolean => {
    if (++comparisons > MAX_COMPARISONS) return false;
    if (Object.is(prev, next)) return true;
    if (level <= 0) return false;

    if (isPlainArray(prev) && isPlainArray(next)) {
      return (
        prev.length === next.length &&
        prev.every((item, index) => isEqual(item, next[index], level - 1))
      );
    }

    if (isPlainObject(prev) && isPlainObject(next)) {
      const keys = Object.keys(prev);
      return (
        keys.length === Object.keys(next).length &&
        keys.every(
          (key) =>
            Object.hasOwn(next, key) &&
            isEqual(prev[key], next[key], level - 1),
        )
      );
    }

    return false;
  };
  return isEqual(a, b, depth);
}

/**
 * Compares parsed hast, which streamdown re-creates on every parse: children
 * recursively until a nested `pre`, `properties`, `position` and `data` one
 * array or object level deep, and any other field by identity, so plugin values
 * nested deeper compare as changed without being walked.
 */
export function isSameHastNode(a: unknown, b: unknown): boolean {
  return isSameHastNodeInner(a, b, true);
}

function isSameHastNodeInner(a: unknown, b: unknown, isRoot: boolean): boolean {
  if (!isRoot && isPreElement(a) && isPreElement(b)) return false;
  if (Object.is(a, b)) return true;
  if (!isPlainObject(a) || !isPlainObject(b)) return false;
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length &&
    keys.every((key) => {
      if (!Object.hasOwn(b, key)) return false;
      const prev = a[key];
      const next = b[key];
      if (key === "children" && isPlainArray(prev) && isPlainArray(next)) {
        return (
          prev.length === next.length &&
          prev.every((child, index) =>
            isSameHastNodeInner(child, next[index], false),
          )
        );
      }
      if (key === "properties" || key === "position" || key === "data") {
        return isEqualToDepth(prev, next, 2);
      }
      return Object.is(prev, next);
    })
  );
}

function isPreElement(value: unknown): boolean {
  if (!isPlainObject(value)) return false;
  return value.type === "element" && value.tagName === "pre";
}
