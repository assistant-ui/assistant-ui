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
  return (
    Array.isArray(value) && Reflect.ownKeys(value).length === value.length + 1
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) return false;
  const prototype = Object.getPrototypeOf(value);
  return (
    (prototype === Object.prototype || prototype === null) &&
    Reflect.ownKeys(value).length === Object.keys(value).length
  );
}

/**
 * Compares JSON shaped arrays and objects by value down to `depth` levels, and
 * anything below that depth or of another kind, including values with symbol
 * keys or non-enumerable properties, by identity.
 */
export function isEqualToDepth(a: unknown, b: unknown, depth: number): boolean {
  if (Object.is(a, b)) return true;
  if (depth <= 0) return false;

  if (isPlainArray(a) && isPlainArray(b)) {
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

type Comparisons = WeakMap<object, { prev: unknown; equal: boolean }>;

const nodeComparisons: Comparisons = new WeakMap();
const fieldComparisons: Comparisons = new WeakMap();

function compareOnce(
  comparisons: Comparisons,
  prev: unknown,
  next: unknown,
  compare: (prev: unknown, next: unknown) => boolean,
): boolean {
  if (Object.is(prev, next)) return true;
  if (typeof next !== "object" || next === null) return compare(prev, next);
  const cached = comparisons.get(next);
  if (cached !== undefined && cached.prev === prev) return cached.equal;
  const equal = compare(prev, next);
  comparisons.set(next, { prev, equal });
  return equal;
}

function isSameHastField(prev: unknown, next: unknown): boolean {
  return compareOnce(fieldComparisons, prev, next, (a, b) =>
    isEqualToDepth(a, b, 2),
  );
}

function compareHastNodes(prev: unknown, next: unknown): boolean {
  if (!isPlainObject(prev) || !isPlainObject(next)) return false;
  const keys = Object.keys(prev);
  return (
    keys.length === Object.keys(next).length &&
    keys.every((key) => {
      if (!Object.hasOwn(next, key)) return false;
      const prevValue = prev[key];
      const nextValue = next[key];
      if (
        key === "children" &&
        isPlainArray(prevValue) &&
        isPlainArray(nextValue)
      ) {
        return (
          prevValue.length === nextValue.length &&
          prevValue.every((child, index) =>
            isSameHastNode(child, nextValue[index]),
          )
        );
      }
      if (key === "properties" || key === "position" || key === "data") {
        return isSameHastField(prevValue, nextValue);
      }
      return Object.is(prevValue, nextValue);
    })
  );
}

/**
 * Compares parsed hast, which streamdown re-creates on every parse: children
 * recursively, `properties`, `position` and `data` one array or object level
 * deep, and any other field by identity, so plugin values nested deeper compare
 * as changed without being walked. Results are kept per object pair, so the
 * nested components that compare the same subtree in one parse walk it once.
 */
export function isSameHastNode(a: unknown, b: unknown): boolean {
  return compareOnce(nodeComparisons, a, b, compareHastNodes);
}
