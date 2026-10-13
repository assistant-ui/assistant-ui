import { evaluateCondition, resolveProps, resolveValue } from "./expressions";
import { childIdsOf, repeatItems, type RepeatScope } from "./tree";
import type { ActionBinding, Spec } from "./types";

/** An action bound to an element's event, with its params resolved. */
export type ResolvedAction = {
  action: string;
  params: Record<string, unknown>;
};

/** One element of a resolved spec. */
export type ResolvedElement = {
  /** The element id. The children a `repeat` renders keep their ids, once per item. */
  id: string;
  type: string;
  props: Record<string, unknown>;
  /** The state path behind each prop bound with `$bindState` or `$bindItem`. */
  bindings: Record<string, string>;
  /** The actions bound to each event. */
  on: Record<string, ResolvedAction[]>;
  children: ResolvedElement[];
  /** Named slots other than `default`. */
  slots: Record<string, ResolvedElement[]>;
  /** The key of the `repeat` item a child of a `repeat` renders for. */
  key?: string;
};

export type ResolveSpecOptions = {
  /** The state to resolve against, such as a store's `getState()` after the user's changes. Defaults to `spec.state`. */
  state?: unknown;
};

/**
 * Resolves a spec into the tree the renderer draws for one state, for a
 * target that cannot run the renderer, such as a chat platform's message
 * format. An element whose `visible` condition fails is left out, `repeat`
 * renders its children once per item, and props and action params hold
 * plain values, with `{ $event }` read as `undefined`. Missing elements and
 * cycles are left out, `watch` does not run, and types are not checked
 * against a catalog.
 */
export function resolveSpec(
  spec: Spec,
  options: ResolveSpecOptions = {},
): ResolvedElement | null {
  const state = options.state ?? spec.state ?? {};
  const resolve = (
    id: unknown,
    scope: RepeatScope,
    ancestors: readonly string[],
    key?: string,
  ): ResolvedElement | null => {
    if (
      typeof id !== "string" ||
      ancestors.includes(id) ||
      !Object.hasOwn(spec.elements, id)
    ) {
      return null;
    }
    const element = spec.elements[id];
    if (
      !element ||
      typeof element !== "object" ||
      typeof element.type !== "string"
    ) {
      return null;
    }
    const ctx = { ...scope, state };
    if (!evaluateCondition(element.visible, ctx)) return null;
    const { props, bindings } = resolveProps(element.props, ctx);
    const on: Record<string, ResolvedAction[]> = {};
    for (const [event, bound] of Object.entries(element.on ?? {})) {
      on[event] = (Array.isArray(bound) ? bound : [bound])
        .filter(
          (binding: unknown): binding is ActionBinding =>
            typeof (binding as ActionBinding | null)?.action === "string",
        )
        .map((binding) => ({
          action: binding.action,
          params: (resolveValue(binding.params ?? {}, ctx) ?? {}) as Record<
            string,
            unknown
          >,
        }));
    }
    const inside = [...ancestors, id];
    const list = (
      ids: readonly unknown[],
      childScope: RepeatScope,
      itemKey?: string,
    ) =>
      ids.flatMap(
        (childId) => resolve(childId, childScope, inside, itemKey) ?? [],
      );
    const children =
      element.repeat && typeof element.repeat.path === "string"
        ? (repeatItems(element.repeat, state) ?? []).flatMap((item) =>
            list(childIdsOf(element, "default"), item.scope, item.key),
          )
        : list(childIdsOf(element, "default"), scope);
    const slots: Record<string, ResolvedElement[]> = {};
    for (const [slot, ids] of Object.entries(element.slots ?? {})) {
      if (slot !== "default" && Array.isArray(ids)) {
        slots[slot] = list(ids, scope);
      }
    }
    return {
      id,
      type: element.type,
      props,
      bindings,
      on,
      children,
      slots,
      ...(key !== undefined ? { key } : {}),
    };
  };
  return resolve(spec.root, {}, []);
}
