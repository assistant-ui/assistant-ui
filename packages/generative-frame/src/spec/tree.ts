import { itemPointer, type ExpressionContext } from "./expressions";
import { getAtPointer } from "./pointer";
import type { SpecElement } from "./types";

/** What the children of a `repeat` read about their item. */
export type RepeatScope = Pick<
  ExpressionContext,
  "item" | "index" | "itemPath"
>;

/** The element ids in a slot, where `default` is `children`. */
export const childIdsOf = (element: SpecElement, slot: string) =>
  (slot === "default" ? element.children : element.slots?.[slot]) ?? [];

/** A JSON Pointer for a state path written with or without its leading slash. */
export const safePointer = (path: string) =>
  path.startsWith("/") || path === "" ? path : `/${path}`;

/**
 * The items a `repeat` renders its children for, each with its key (the
 * item's `key` field, else its index) and the scope its children read, or
 * `undefined` when the state at `path` is not an array.
 */
export function repeatItems(
  repeat: { path: string; key?: string },
  state: unknown,
): { key: string; scope: RepeatScope }[] | undefined {
  const items = getAtPointer(state, safePointer(repeat.path));
  if (!Array.isArray(items)) return undefined;
  return items.map((item: unknown, index) => ({
    key:
      repeat.key && item && typeof item === "object"
        ? String((item as Record<string, unknown>)[repeat.key] ?? index)
        : String(index),
    scope: { item, index, itemPath: itemPointer(repeat.path, index) },
  }));
}
