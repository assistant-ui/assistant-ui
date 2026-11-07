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

/** A JSON Pointer for a state path written with or without its leading slash. */
export const safePointer = (path: string) =>
  path.startsWith("/") || path === "" ? path : `/${path}`;

export function exceedsRenderBudget(spec: Spec, state: unknown): boolean {
  if (!spec?.elements || typeof spec.elements !== "object") return false;
  const ancestors = new Set<string>();
  const count = (id: unknown, depth: number): number => {
    if (
      typeof id !== "string" ||
      ancestors.has(id) ||
      !Object.hasOwn(spec.elements, id)
    )
      return 0;
    const element = spec.elements[id];
    if (
      !element ||
      typeof element !== "object" ||
      typeof element.type !== "string"
    )
      return 0;
    if (depth > 64) return 5001;
    ancestors.add(id);
    let total = 1;
    const children = childIdsOf(element, "default");
    if (Array.isArray(children)) {
      const repeat = element.repeat;
      const items =
        repeat && typeof repeat.path === "string"
          ? getAtPointer(state, safePointer(repeat.path))
          : undefined;
      const copies =
        repeat && typeof repeat.path === "string"
          ? Array.isArray(items)
            ? items.length
            : 0
          : 1;
      if (copies) {
        let perItem = 0;
        for (const child of children) {
          perItem += count(child, depth + 1);
          if (perItem > 5000) break;
        }
        total += perItem * copies;
      }
    }
    if (total <= 5000) {
      for (const ids of Object.values(element.slots ?? {})) {
        if (!Array.isArray(ids)) continue;
        for (const child of ids) {
          total += count(child, depth + 1);
          if (total > 5000) break;
        }
        if (total > 5000) break;
      }
    }
    ancestors.delete(id);
    return total;
  };
  return count(spec.root, 1) > 5000;
}

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
