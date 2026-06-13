import type {
  ExtractResourceReturnType,
  RenderResult,
  ResourceElement,
  ResourceFiber,
} from "../core/types";
import {
  unmountResourceFiber,
  renderResourceFiber,
  commitResourceFiber,
} from "../core/ResourceFiber";
import { useResourceFiberHost } from "./utils/useResourceFiberHostUtils";
import { useEffect, useMemo } from "react";
import { useRenderMemo } from "./utils/useRenderMemo";
import { depsShallowEqual } from "./utils/depsShallowEqual";

// What this render decided for a child, applied in the commit phase.
//   { ... }   render to commit; `remount` set when the hook changed
//   "skip"    bailed out; keep the committed result
//   "delete"  removed from the list; unmount
type Pending =
  | {
      result: RenderResult;
      deps: readonly unknown[] | undefined;
      remount?: ResourceFiber<unknown>;
    }
  | "skip"
  | "delete";

type FiberState = {
  fiber: ResourceFiber<unknown>;
  next: Pending;
  // Set when this child (or a descendant) dispatches, cleared on commit.
  isDirty: boolean;
  // Last committed deps + value, used to decide and serve a bailout.
  committedDeps: readonly unknown[] | undefined;
  committedValue: unknown;
};

// Looked up by key (not captured) so it survives fiber replacement on remount.
const markChildDirty = (
  fibers: Map<string | number, FiberState>,
  key: string | number,
) => {
  const state = fibers.get(key);
  if (state) state.isDirty = true;
};

// A child is reused when its deps are unchanged and it has no pending work.
const canReuse = (state: FiberState, deps: readonly unknown[] | undefined) =>
  !state.isDirty &&
  deps !== undefined &&
  state.committedDeps !== undefined &&
  depsShallowEqual(state.committedDeps, deps);

export function useResources<E extends ResourceElement<any, any[]>>(
  elements: readonly E[],
): ExtractResourceReturnType<E>[] {
  const fibers = useMemo(() => new Map<string | number, FiberState>(), []);

  // Process each element

  const { version, createFiber } = useResourceFiberHost();
  const res = useRenderMemo(() => {
    void version;

    const seenKeys = new Set<string | number>();
    const results: any[] = [];
    let newCount = 0;

    // Create/update fibers and render
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i]!;

      const elementKey = element.key;
      if (elementKey === undefined) {
        throw new Error(
          `useResources did not provide a key for array at index ${i}`,
        );
      }

      if (seenKeys.has(elementKey))
        throw new Error(`Duplicate key ${elementKey} in useResources`);
      seenKeys.add(elementKey);

      let state = fibers.get(elementKey);
      if (!state) {
        const fiber = createFiber(element.hook, element.key, () =>
          markChildDirty(fibers, elementKey),
        );
        const result = renderResourceFiber(fiber, element.args);
        state = {
          fiber,
          next: { result, deps: element.deps },
          isDirty: false,
          committedDeps: undefined,
          committedValue: undefined,
        };
        newCount++;
        fibers.set(elementKey, state);
      } else if (state.fiber.hook !== element.hook) {
        const fiber = createFiber(element.hook, element.key, () =>
          markChildDirty(fibers, elementKey),
        );
        const result = renderResourceFiber(fiber, element.args);
        state.next = { result, deps: element.deps, remount: fiber };
      } else if (canReuse(state, element.deps)) {
        state.next = "skip";
      } else {
        const result = renderResourceFiber(state.fiber, element.args);
        state.next = { result, deps: element.deps };
      }

      // Reused children serve their committed value; everything else its render.
      results.push(
        typeof state.next === "object"
          ? state.next.result.value
          : state.committedValue,
      );
    }

    // Clean up removed fibers (only if there might be stale ones)
    if (fibers.size > results.length - newCount) {
      for (const key of fibers.keys()) {
        if (!seenKeys.has(key)) {
          fibers.get(key)!.next = "delete";
        }
      }
    }

    return results;
  }, [elements, fibers, createFiber, version]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      for (const key of fibers.keys()) {
        const fiber = fibers.get(key)!.fiber;
        unmountResourceFiber(fiber);
      }
    };
  }, [fibers]);

  useEffect(() => {
    void res; // as a performance optimization, we only run if the results have changed

    for (const [key, state] of fibers.entries()) {
      const next = state.next;
      if (next === "delete") {
        if (state.fiber.isMounted) {
          unmountResourceFiber(state.fiber);
        }
        fibers.delete(key);
      } else if (next === "skip") {
        // Bailed this render: nothing to commit, keep committed deps/value.
      } else {
        if (next.remount) {
          unmountResourceFiber(state.fiber);
          state.fiber = next.remount;
        }
        commitResourceFiber(state.fiber, next.result);
        state.committedDeps = next.deps;
        state.committedValue = next.result.value;
        state.isDirty = false;
      }
    }
  }, [res, fibers]);

  return res;
}
