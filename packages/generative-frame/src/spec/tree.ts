import { itemPointer, type ExpressionContext } from "./expressions";
import { getAtPointer } from "./pointer";
import type { Spec, SpecElement } from "./types";

/** What the children of a `repeat` read about their item. */
export type RepeatScope = Pick<
  ExpressionContext,
  "item" | "index" | "itemPath"
>;

/** The element ids in a slot, where `default` is `children`. */
export const childIdsOf = (element: SpecElement, slot: string) =>
  (slot === "default" ? element.children : element.slots?.[slot]) ?? [];

/** The first element, in reading order from the root, that a parent lists but the spec does not hold yet: where a streaming spec grows next. */
export function firstMissingId(spec: Spec): string | undefined {
  const visited = new Set<string>();
  const visit = (id: unknown): string | undefined => {
    if (typeof id !== "string" || visited.has(id)) return undefined;
    visited.add(id);
    const element = Object.hasOwn(spec.elements, id)
      ? spec.elements[id]
      : undefined;
    if (
      !element ||
      typeof element !== "object" ||
      typeof element.type !== "string"
    )
      return id;
    for (const slot of ["default", ...Object.keys(element.slots ?? {})]) {
      const ids = childIdsOf(element, slot);
      if (!Array.isArray(ids)) continue;
      for (const child of ids) {
        const found = visit(child);
        if (found !== undefined) return found;
      }
    }
    return undefined;
  };
  return spec.root ? visit(spec.root) : undefined;
}

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
