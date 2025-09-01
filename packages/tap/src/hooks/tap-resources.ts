import { ResourceElement, ResourceFiber } from "../core/types";
import { tapEffect } from "./tap-effect";
import { tapMemo } from "./tap-memo";
import { tapState } from "./tap-state";
import {
  createResourceFiber,
  unmountResource,
  renderResource,
  commitResource,
} from "../core/ResourceFiber";

export function tapResources<
  T extends ReadonlyArray<ResourceElement<any, any>>,
>(
  elements: T,
): { [K in keyof T]: T[K] extends ResourceElement<infer R, any> ? R : never } {
  // Validate keys
  const seenKeys = new Set<string | number>();
  elements.forEach((element, index) => {
    if (element.key === undefined) {
      throw new Error(
        `tapResources: All resource elements must have a key. Element at index ${index} is missing a key.`,
      );
    }
    if (seenKeys.has(element.key)) {
      throw new Error(
        `tapResources: Duplicate key "${element.key}" found. All keys must be unique.`,
      );
    }
    seenKeys.add(element.key);
  });

  const [stateVersion, rerender] = tapState({});

  // Create a map of current elements by key for efficient lookup
  const elementsByKey = tapMemo(
    () => new Map(elements.map((element) => [element.key!, element])),
    [elements],
  );

  // Track fibers persistently across renders
  const [fibers] = tapState(
    () => new Map<string | number, ResourceFiber<any, any>>(),
  );

  // Process each element
  const results = tapMemo(() => {
    const resultMap = new Map<string | number, any>();
    const currentKeys = new Set<string | number>();

    // Create/update fibers and render
    elementsByKey.forEach((element, key) => {
      currentKeys.add(key);

      let fiber = fibers.get(key);

      // Create new fiber if needed or type changed
      if (!fiber || fiber.resourceFn !== element.type) {
        if (fiber) unmountResource(fiber);
        fiber = createResourceFiber(element.type, () => rerender({}));
        fibers.set(key, fiber);
      }

      // Render with current props
      const result = renderResource(fiber, element.props);
      resultMap.set(key, result);
    });

    // Clean up removed fibers
    fibers.forEach((fiber, key) => {
      if (!currentKeys.has(key)) {
        unmountResource(fiber);
        fibers.delete(key);
      }
    });

    return resultMap;
  }, [elementsByKey, stateVersion]);

  // Commit all renders
  tapEffect(() => {
    results.forEach((result, key) => {
      const fiber = fibers.get(key);
      if (fiber) {
        commitResource(fiber, result);
      }
    });
  }, [results, fibers]);

  // Cleanup on unmount
  tapEffect(() => {
    return () => {
      fibers.forEach((fiber) => {
        unmountResource(fiber);
      });
      fibers.clear();
    };
  }, [fibers]);

  // Return results in the same order as input elements
  return tapMemo(
    () => elements.map((element) => results.get(element.key!)?.state),
    [elements, results],
  ) as any;
}
