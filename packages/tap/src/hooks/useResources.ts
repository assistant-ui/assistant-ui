import type {
  ExtractResourceReturnType,
  RenderResult,
  ResourceElement,
  ResourceFiber,
} from "../core/types";
import { useEffect } from "./useEffect";
import { useMemo } from "./useMemo";
import { useCallback } from "./useCallback";
import {
  createResourceFiber,
  unmountResourceFiber,
  renderResourceFiber,
  commitResourceFiber,
} from "../core/ResourceFiber";
import { useRef } from "./useRef";
import { getCurrentResourceFiber } from "../core/helpers/execution-context";

type FiberState = {
  fiber: ResourceFiber<unknown, unknown>;
  next:
    | RenderResult
    | [ResourceFiber<unknown, unknown>, RenderResult]
    | "delete";
};

export function useResources<E extends ResourceElement<any, any>>(
  getElements: () => readonly E[],
  getElementsDeps?: readonly unknown[],
): ExtractResourceReturnType<E>[] {
  const versionRef = useRef(0);
  const version = versionRef.current;

  const parentFiber = useMemo(() => getCurrentResourceFiber(), []);
  const markDirty = useMemo(
    () => () => {
      versionRef.current++;
      parentFiber.markDirty?.();
    },
    [],
  );
  const fibers = useMemo(() => new Map<string | number, FiberState>(), []);

  const getElementsMemo = getElementsDeps
    ? // oxlint-disable-next-line tap-hooks/exhaustive-deps, react-hooks/rules-of-hooks -- deps forwarded by caller; getElementsDeps presence is fixed per call site
      useCallback(getElements, getElementsDeps)
    : getElements;

  // Process each element

  const res = useMemo(() => {
    void version;

    const elementsArray = getElementsMemo();
    const seenKeys = new Set<string | number>();
    const results: any[] = [];
    let newCount = 0;

    // Create/update fibers and render
    for (let i = 0; i < elementsArray.length; i++) {
      const element = elementsArray[i]!;

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
        const fiber = createResourceFiber(
          element.type,
          parentFiber.root,
          markDirty,
        );
        const result = renderResourceFiber(fiber, element.props);
        state = {
          fiber,
          next: result,
        };
        newCount++;
        fibers.set(elementKey, state);
        results.push(result.output);
      } else if (state.fiber.type !== element.type) {
        const fiber = createResourceFiber(
          element.type,
          parentFiber.root,
          markDirty,
        );
        const result = renderResourceFiber(fiber, element.props);
        state.next = [fiber, result];
        results.push(result.output);
      } else {
        state.next = renderResourceFiber(state.fiber, element.props);
        results.push(state.next.output);
      }
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
  }, [getElementsMemo, version]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      for (const key of fibers.keys()) {
        const fiber = fibers.get(key)!.fiber;
        unmountResourceFiber(fiber);
      }
    };
  }, []);

  useEffect(() => {
    res; // as a performance optimization, we only run if the results have changed

    for (const [key, state] of fibers.entries()) {
      if (state.next === "delete") {
        if (state.fiber.isMounted) {
          unmountResourceFiber(state.fiber);
        }

        fibers.delete(key);
      } else if (Array.isArray(state.next)) {
        unmountResourceFiber(state.fiber);
        state.fiber = state.next[0];
        commitResourceFiber(state.fiber, state.next[1]);
      } else {
        commitResourceFiber(state.fiber, state.next);
      }
    }
  }, [res]);

  return res;
}
