import {
  ExtractResourceReturnType,
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
import { tapConst } from "./tap-const";

export type TapResourcesRenderResult = {
  add: [string | number, ResourceFiber<unknown, unknown>][];
  remove: (string | number)[];
  commit: [string | number, RenderResult][];
  seenKeys: Set<string | number>;
  return: any[];
};

export function tapResources<E extends ResourceElement<any, any>>(
  getElements: () => readonly E[],
  getElementsDeps?: readonly unknown[],
): ExtractResourceReturnType<E>[] {
  const [version, setVersion] = tapState(0);
  const rerender = tapConst(() => () => setVersion((v) => v + 1), []);

  const fibers = tapConst(
    () => new Map<string | number, ResourceFiber<unknown, unknown>>(),
    [],
  );

  const getElementsMemo = getElementsDeps
    ? // biome-ignore lint/correctness/useExhaustiveDependencies: library code
      tapCallback(getElements, getElementsDeps)
    : getElements;

  // Process each element

  const results = tapMemo(() => {
    void version;

    const elementsArray = getElementsMemo();

    const results: TapResourcesRenderResult = {
      remove: [],
      add: [],
      commit: [],
      seenKeys: new Set(),
      return: [],
    };

    // Create/update fibers and render
    for (let i = 0; i < elementsArray.length; i++) {
      const element = elementsArray[i]!;

      const elementKey = element.key;
      if (elementKey === undefined) {
        throw new Error(
          `tapResources did not provide a key for array at index ${i}`,
        );
      }

      if (results.seenKeys.has(elementKey))
        throw new Error(`Duplicate key ${elementKey} in tapResources`);
      results.seenKeys.add(elementKey);

      let fiber = fibers.get(elementKey);

      if (!fiber || fiber.type !== element.type) {
        // Create new fiber if needed or type changed
        if (fiber) results.remove.push(elementKey);
        fiber = createResourceFiber(element.type, (callback) => {
          if (callback()) rerender();
        });
        results.add.push([elementKey, fiber]);
      }

      // Render with current props
      const renderResult = renderResourceFiber(fiber, element.props);
      results.commit.push([elementKey, renderResult]);

      results.return.push(renderResult.output);
    }

    // Clean up removed fibers (only if there might be stale ones)
    if (
      fibers.size >
      results.commit.length - results.add.length + results.remove.length
    ) {
      for (const key of fibers.keys()) {
        if (!results.seenKeys.has(key)) {
          results.remove.push(key);
        }
      }
    }

    return results;
  }, [getElementsMemo, version]);

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
