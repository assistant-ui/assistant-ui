import { RenderResult, ResourceElement, ResourceFiber } from "../core/types";
import { tapEffect } from "./tap-effect";
import { tapRef } from "./tap-ref";
import {
  createResourceFiber,
  unmountResource,
  renderResource,
  commitResource,
} from "../core/ResourceFiber";
import { tapRerender } from "./tap-rerender";

interface ResourceEntry<R, P> {
  fiber: ResourceFiber;
  type: (props: P) => R;
  props: P;
  state: R;
}

// TODO make safe for concurrent rendering
export function tapResources<
  T extends ReadonlyArray<ResourceElement<any, any>>
>(
  elements: T
): { [K in keyof T]: T[K] extends ResourceElement<any, infer R> ? R : never } {
  // Validate that all elements have keys and keys are unique
  const seenKeys = new Set<string | number>();
  elements.forEach((element, index) => {
    if (element.key === undefined) {
      throw new Error(
        `tapResources: All resource elements must have a key. Element at index ${index} is missing a key.`
      );
    }
    if (seenKeys.has(element.key)) {
      throw new Error(
        `tapResources: Duplicate key "${element.key}" found. All keys must be unique.`
      );
    }
    seenKeys.add(element.key);
  });

  // Use a ref to store resource entries persistently
  const entriesRef = tapRef<Map<string | number, ResourceEntry<any, any>>>();
  if (!entriesRef.current) {
    entriesRef.current = new Map();
  }
  const entries = entriesRef.current;

  // State to trigger re-renders when child resources update
  const rerender = tapRerender();

  // Process elements and update entries
  const currentKeys = new Set<string | number>();
  const renderContexts: Array<{
    entry: ResourceEntry<any, any>;
    result: RenderResult;
  }> = [];

  // First pass: create/update instances and render
  elements.forEach((element) => {
    const key = element.key!;
    currentKeys.add(key);

    let entry = entries.get(key);

    // Create new fiber if needed or type changed
    if (!entry || entry.type !== element.type) {
      // Clean up old fiber if it exists
      if (entry) {
        unmountResource(entry.fiber);
      }

      const fiber = createResourceFiber(element.type, rerender);
      entry = {
        fiber,
        type: element.type,
        props: element.props,
        state: undefined as any,
      };
      entries.set(key, entry);
    }

    // Update props if changed
    entry.props = element.props;

    // Render with current props
    const result = renderResource(entry.fiber, element.props);
    entry.state = result.state;

    renderContexts.push({ entry, result: result });
  });

  // No longer need mounting effect since we don't track mount state

  // Effect to commit renders
  tapEffect(() => {
    // Commit all renders
    renderContexts.forEach(({ entry, result: ctx }) => {
      commitResource(entry.fiber, ctx);
    });
  });

  // Effect to clean up removed resources
  tapEffect(() => {
    // Clean up removed fibers
    const keysToRemove: (string | number)[] = [];
    for (const [key, entry] of entries) {
      if (!currentKeys.has(key)) {
        unmountResource(entry.fiber);
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => entries.delete(key));
  });

  // Effect for final cleanup when this component unmounts
  tapEffect(() => {
    return () => {
      // Unmount all resources when the parent unmounts
      entries.forEach((entry) => {
        unmountResource(entry.fiber);
      });
      entries.clear();
    };
  }, []);

  // Return results in the same order as input elements
  return elements.map((element) => entries.get(element.key!)?.state) as any;
}
