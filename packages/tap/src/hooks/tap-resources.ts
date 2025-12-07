import { RenderResult, ResourceElement, ResourceFiber } from "../core/types";
import { tapEffect } from "./tap-effect";
import { tapMemo } from "./tap-memo";
import { rerenderFiber, tapState } from "./tap-state";
import { tapCallback } from "./tap-callback";
import {
  createResourceFiber,
  unmountResource,
  renderResource,
  commitResource,
} from "../core/ResourceFiber";
import { getCurrentResourceFiber } from "../core/execution-context";

const tapRerender = () => {
  const fiber = getCurrentResourceFiber();
  return tapCallback(() => rerenderFiber(fiber), []);
};

export type TapResourcesRenderResult<R, K extends string | number | symbol> = {
  add: [K, ResourceFiber<R, any>][];
  remove: K[];
  commit: [K, RenderResult][];
  return: Record<K, R>;
};

export function tapResources<
  M extends Record<string | number | symbol, any>,
  R,
>(
  map: M,
  getElement: (t: M[keyof M], key: keyof M) => ResourceElement<R>,
  getElementDeps?: any[],
): { [K in keyof M]: R } {
  const rerender = tapRerender();
  type K = keyof M;
  const [fibers] = tapState(() => new Map<K, ResourceFiber<R, any>>());

  const getElementMemo = getElementDeps
    ? tapMemo(() => getElement, getElementDeps)
    : getElement;

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
      const renderResult = renderResource(fiber, element.props);
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
  }, [map, getElementMemo]);

  tapEffect(() => {
    for (const key of results.remove) {
      unmountResource(fibers.get(key)!);
      fibers.delete(key);
    }
    for (const [key, fiber] of results.add) {
      fibers.set(key, fiber);
    }
    for (const [key, result] of results.commit) {
      commitResource(fibers.get(key)!, result);
    }
  }, [results]);

  // Cleanup on unmount
  tapEffect(() => {
    return () => {
      for (const key of fibers.keys()) {
        unmountResource(fibers.get(key)!);
        fibers.delete(key);
      }
    };
  }, []);

  return results.return;
}
