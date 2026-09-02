import type {
  ExtractResourceReturnType,
  ResourceElement,
  ResourceFiber,
} from "../core/types";
import {
  discardWipRender,
  unmountResourceFiber,
  renderResourceFiber,
  commitResourceFiber,
} from "../core/ResourceFiber";
import {
  bubbleContextDeps,
  hasChangedContexts,
  hasContextDepsChanged,
} from "../core/context";
import { useResourceFiberHost } from "./utils/useResourceFiberHostUtils";
import { useEffect, useRef, useState } from "react";
import { useRenderMemo } from "./utils/useRenderMemo";
import { depsShallowEqual } from "./utils/depsShallowEqual";

// What this render decided for a child, applied in the commit phase.
//   { ... }   render to commit; `remount` set when the hook changed
//   "skip"    bailed out; keep the committed result
//   "delete"  removed from the list; unmount
type Pending =
  | {
      value: any;
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

type RenderResult<T> = {
  values: T[];
  commitKeys: readonly (string | number)[] | null;
  keyToIndex: ReadonlyMap<string | number, number>;
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
  !hasContextDepsChanged(state.fiber) &&
  deps !== undefined &&
  state.committedDeps !== undefined &&
  depsShallowEqual(state.committedDeps, deps);

const hasAnyChildContextDepsChanged = (
  fibers: Map<string | number, FiberState>,
) => {
  if (!hasChangedContexts()) return false;

  for (const { fiber } of fibers.values()) {
    if (hasContextDepsChanged(fiber)) return true;
  }

  return false;
};

export function useResources<E extends ResourceElement<any>>(
  elements: readonly E[],
): ExtractResourceReturnType<E>[] {
  const [fibers] = useState(() => new Map<string | number, FiberState>());
  const committedElements = useRef<readonly E[] | null>(null);
  const committedValues = useRef<ExtractResourceReturnType<E>[] | null>(null);
  const committedKeyToIndex = useRef<ReadonlyMap<
    string | number,
    number
  > | null>(null);
  const pendingStructuralChange = useRef(false);
  const needsFullCommit = useRef(false);

  // Process each element

  const { version, createFiber } = useResourceFiberHost();
  const hasAnyContextDepsChanged = hasAnyChildContextDepsChanged(fibers);

  const rendered = useRenderMemo<RenderResult<ExtractResourceReturnType<E>>>(
    () => {
      void version;

      if (
        committedElements.current === elements &&
        committedValues.current !== null &&
        committedKeyToIndex.current !== null &&
        !pendingStructuralChange.current &&
        !hasAnyContextDepsChanged
      ) {
        const values = committedValues.current.slice();
        const commitKeys: Array<string | number> = [];

        for (const [key, state] of fibers) {
          if (!state.isDirty) {
            if (typeof state.next === "object") {
              discardWipRender(state.fiber);
              state.next = "skip";
            }
            if (state.fiber.contextDeps) {
              bubbleContextDeps(state.fiber, state.fiber.contextDeps);
            }
            continue;
          }
          const index = committedKeyToIndex.current.get(key);
          if (index === undefined) continue;

          const element = elements[index]!;
          const value = renderResourceFiber(
            state.fiber,
            element.args,
          ) as ExtractResourceReturnType<E>;
          state.next = { value, deps: element.deps };
          values[index] = value;
          commitKeys.push(key);
        }

        return {
          values,
          commitKeys,
          keyToIndex: committedKeyToIndex.current,
        };
      }

      const values: any[] = [];
      const keyToIndex = new Map<string | number, number>();
      let newCount = 0;

      for (let i = 0; i < elements.length; i++) {
        const element = elements[i]!;

        const elementKey = element.key;
        if (elementKey === undefined) {
          throw new Error(
            `useResources did not provide a key for array at index ${i}`,
          );
        }

        if (keyToIndex.has(elementKey))
          throw new Error(`Duplicate key ${elementKey} in useResources`);
        keyToIndex.set(elementKey, i);

        let state = fibers.get(elementKey);
        if (!state) {
          const fiber = createFiber(element.hook, element.key, () =>
            markChildDirty(fibers, elementKey),
          );
          const value = renderResourceFiber(fiber, element.args);
          state = {
            fiber,
            next: { value: value, deps: element.deps },
            isDirty: false,
            committedDeps: undefined,
            committedValue: undefined,
          };
          newCount++;
          pendingStructuralChange.current = true;
          fibers.set(elementKey, state);
        } else if (state.fiber.hook !== element.hook) {
          const fiber = createFiber(element.hook, element.key, () =>
            markChildDirty(fibers, elementKey),
          );
          const value = renderResourceFiber(fiber, element.args);
          state.next = { value: value, deps: element.deps, remount: fiber };
          pendingStructuralChange.current = true;
        } else if (canReuse(state, element.deps)) {
          if (typeof state.next === "object") {
            discardWipRender(state.fiber);
          }
          if (state.fiber.contextDeps) {
            bubbleContextDeps(state.fiber, state.fiber.contextDeps);
          }
          state.next = "skip";
        } else {
          const value = renderResourceFiber(state.fiber, element.args);
          state.next = { value: value, deps: element.deps };
        }

        values.push(
          typeof state.next === "object"
            ? state.next.value
            : state.committedValue,
        );
      }

      // Clean up removed fibers (only if there might be stale ones)
      if (fibers.size > values.length - newCount) {
        for (const key of fibers.keys()) {
          if (!keyToIndex.has(key)) {
            fibers.get(key)!.next = "delete";
            pendingStructuralChange.current = true;
          }
        }
      }

      return { values, commitKeys: null, keyToIndex };
    },
    [elements, fibers, createFiber, version],
    hasAnyContextDepsChanged,
  );
  const val = rendered.values;
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      needsFullCommit.current = true;
      for (const key of fibers.keys()) {
        unmountResourceFiber(fibers.get(key)!.fiber);
      }
    };
  }, [fibers]);

  useEffect(() => {
    void val; // as a performance optimization, we only run if the results have changed

    const entries =
      rendered.commitKeys === null || needsFullCommit.current
        ? fibers.entries()
        : rendered.commitKeys.map((key) => [key, fibers.get(key)!] as const);

    for (const [key, state] of entries) {
      const next = state.next;
      if (next === "delete") {
        unmountResourceFiber(state.fiber);
        fibers.delete(key);
      } else if (next === "skip") {
        // Bailed this render: nothing to commit, keep committed deps/value.
        if (!state.fiber.isNeverMounted && !state.fiber.isMounted) {
          commitResourceFiber(state.fiber);
        }
      } else {
        if (next.remount) {
          unmountResourceFiber(state.fiber);
          state.fiber = next.remount;
        }
        commitResourceFiber(state.fiber);
        state.committedDeps = next.deps;
        state.committedValue = next.value;
        state.isDirty = false;
        state.next = "skip";
      }
    }

    committedElements.current = elements;
    // The returned array is caller-visible and may be mutated after render.
    committedValues.current = val.slice();
    committedKeyToIndex.current = rendered.keyToIndex;
    pendingStructuralChange.current = false;
    needsFullCommit.current = false;
  }, [elements, fibers, rendered, val]);

  return val;
}
