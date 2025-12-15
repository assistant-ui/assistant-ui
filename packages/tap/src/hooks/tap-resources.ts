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

const getKey = (
  isArray: boolean,
  mapKey: string,
  elementKey: string | number | undefined,
) => {
  if (isArray && elementKey === undefined) {
    throw new Error(
      `tapResources did not provide a key for array at index ${mapKey}`,
    );
  }

  if (typeof elementKey === "undefined") return `m${mapKey}`;
  if (typeof elementKey === "number") return elementKey;
  return `e${elementKey}`;
};

export type TapResourcesRenderResult = {
  add: [string | number, ResourceFiber<unknown, unknown>][];
  remove: (string | number)[];
  commit: [string | number, RenderResult][];
  seenKeys: Set<string | number>;
  return: Record<string, unknown> | unknown[];
};

export function tapResources<
  M extends readonly any[],
  E extends ResourceElement<any, any>,
>(
  arr: M,
  getElement: (t: M[number], key: string) => E,
  getElementDeps: readonly any[],
): ExtractResourceReturnType<E>[];
export function tapResources<
  M extends Readonly<Record<string, any>>,
  E extends ResourceElement<any, any>,
>(
  map: M,
  getElement: <K extends keyof M>(t: M[K], key: K) => E,
  getElementDeps: readonly unknown[],
): { [K in keyof M]: ExtractResourceReturnType<E> };
export function tapResources(
  map: Readonly<Record<string | number, unknown>>,
  getElement: (t: unknown, key: string) => ResourceElement<unknown, unknown>,
  getElementDeps: readonly unknown[],
): Record<string, unknown> | unknown[] {
  const [version, setVersion] = tapState(0);
  const rerender = tapConst(() => () => setVersion((v) => v + 1), []);

  const fibers = tapConst(
    () => new Map<string | number, ResourceFiber<unknown, unknown>>(),
    [],
  );

  const getElementMemo = tapCallback(getElement, [...getElementDeps]);

  // Process each element

  const results = tapMemo(() => {
    void version;

    const results: TapResourcesRenderResult = {
      remove: [],
      add: [],
      commit: [],
      seenKeys: new Set(),
      return: Array.isArray(map) ? [] : Object.create(null),
    };

    // Create/update fibers and render
    for (const mapKey of Object.keys(map)) {
      const element = getElementMemo(map[mapKey], mapKey);
      const elementKey = getKey(Array.isArray(map), mapKey, element.key);

      if (results.seenKeys.has(elementKey))
        throw new Error(`Duplicate key ${elementKey} in tapResources`);
      results.seenKeys.add(elementKey);

      let fiber = fibers.get(elementKey);

      if (!fiber || fiber.resource !== element.type) {
        // Create new fiber if needed or type changed
        if (fiber) results.remove.push(elementKey);
        fiber = createResourceFiber(element.type, rerender);
        results.add.push([elementKey, fiber]);
      }

      // Render with current props
      const renderResult = renderResourceFiber(fiber, element.props);
      results.commit.push([elementKey, renderResult]);

      results.return[mapKey as keyof typeof results.return] =
        renderResult.output;
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
