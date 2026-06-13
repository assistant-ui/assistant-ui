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

type FiberState = {
  fiber: ResourceFiber<unknown>;
  next: RenderResult | [ResourceFiber<unknown>, RenderResult] | "delete";
};

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
        const fiber = createFiber(element.hook, element.key);
        const result = renderResourceFiber(fiber, element.args);
        state = {
          fiber,
          next: result,
        };
        newCount++;
        fibers.set(elementKey, state);
        results.push(result.value);
      } else if (state.fiber.hook !== element.hook) {
        const fiber = createFiber(element.hook, element.key);
        const result = renderResourceFiber(fiber, element.args);
        state.next = [fiber, result];
        results.push(result.value);
      } else {
        state.next = renderResourceFiber(state.fiber, element.args);
        results.push(state.next.value);
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
  }, [res, fibers]);

  return res;
}
