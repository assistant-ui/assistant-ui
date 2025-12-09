import {
  ExtractResourceOutput,
  RenderResult,
  ResourceElement,
  ResourceFiber,
} from "../core/types";
import { tapEffect } from "./tap-effect";
import { tapMemo } from "./tap-memo";
import { tapState } from "./tap-state";
import { tapCallback } from "./tap-callback";
import {
  createResourceFiber,
  unmountResourceFiber,
  renderResourceFiber,
  commitResourceFiber,
} from "../core/ResourceFiber";

export type TapResourcesRenderResult<R, K extends string | number | symbol> = {
  add: [K, ResourceFiber<R, any>][];
  remove: K[];
  commit: [K, RenderResult][];
  return: Record<K, R>;
};

export function tapResources<
  M extends Record<string | number | symbol, any>,
  E extends ResourceElement<any, any>,
>(
  map: M,
  getElement: (t: M[keyof M], key: keyof M) => E,
  getElementDeps: any[],
): { [K in keyof M]: ExtractResourceOutput<E> } {
  type R = ExtractResourceOutput<E>;
  const [version, setVersion] = tapState(0);
  const rerender = tapCallback(() => setVersion((v) => v + 1), []);

  type K = keyof M;
  const [fibers] = tapState(() => new Map<K, ResourceFiber<R, any>>());

  const getElementMemo = tapMemo(() => getElement, getElementDeps);

  // Process each element

  const results = tapMemo(() => {
    const results: TapResourcesRenderResult<R, K> = {
      remove: [],
      add: [],
      commit: [],
      return: {} as Record<K, R>,
    };

    // Create/update fibers and render
    for (const key in map) {
      const value = map[key as K];
      const element = getElementMemo(value, key);

      let fiber = fibers.get(key);

      // Create new fiber if needed or type changed
      if (!fiber || fiber.resource !== element.type) {
        if (fiber) results.remove.push(key);
        fiber = createResourceFiber(element.type, rerender);
        results.add.push([key, fiber]);
      }

      // Render with current props
      const renderResult = renderResourceFiber(fiber, element.props);
      results.commit.push([key, renderResult]);

      results.return[key] = renderResult.state;
    }

    // Clean up removed fibers (only if there might be stale ones)
    if (
      fibers.size >
      results.commit.length - results.add.length + results.remove.length
    ) {
      for (const key of fibers.keys()) {
        if (!(key in map)) {
          results.remove.push(key);
        }
      }
    }

    return results;
  }, [map, getElementMemo, version]);

  // Cleanup on unmount
  tapEffect(() => {
    return () => {
      for (const key of fibers.keys()) {
        unmountResourceFiber(fibers.get(key)!);
        fibers.delete(key);
      }
    };
  }, []);

  tapEffect(() => {
    for (const key of results.remove) {
      unmountResourceFiber(fibers.get(key)!);
      fibers.delete(key);
    }
    for (const [key, fiber] of results.add) {
      fibers.set(key, fiber);
    }
    for (const [key, result] of results.commit) {
      commitResourceFiber(fibers.get(key)!, result);
    }
  }, [results]);

  return results.return;
}
