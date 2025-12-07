import { ResourceElement, tapMemo } from "@assistant-ui/tap";
import { tapApiResources } from "./tapApiResource";
import type { ApiObject, ScopeOutputOf } from "./types";

/**
 * Creates a lookup-based resource collection for managing lists of items.
 * Returns both the combined state array and an API function to lookup specific items.
 *
 * Resources should return plain objects with { state, key?, api }.
 * This function internally wraps each element with tapApiResource to create
 * stable API proxies.
 *
 * @param elements - Array of [key, element] tuples, each element returning { state, key?, api }
 * @returns Object with { state: TState[], api: (lookup) => TApi }
 *
 * The api function accepts { index: number } or { key: string } for lookups.
 * Consumers can wrap it to rename the key field (e.g., to "id" or "toolCallId").
 *
 * @example
 * ```typescript
 * const FooItemResource = resource((): ScopeOutput<"foo"> => {
 *   const [state, setState] = tapState({ id, bar });
 *   return { state, key: id, api: { updateBar, remove } };
 * });
 *
 * const foos = tapLookupResources(
 *   items.map((item) => [item.id, FooItemResource({ id: item.id })] as const)
 * );
 *
 * // Access state array
 * const allStates = foos.state;
 *
 * // Lookup by index or key
 * const first = foos.api({ index: 0 });
 * const byKey = foos.api({ key: "foo-1" });
 * ```
 */
export const tapLookupResources = <
  TState,
  TApi extends ApiObject,
  M extends Record<string | number | symbol, any>,
>(
  map: M,
  getElement: (
    t: M[keyof M],
    key: keyof M,
  ) => ResourceElement<ScopeOutputOf<TState, TApi>>,
  getElementDeps?: any[],
): {
  state: TState[];
  api: (lookup: { index: number } | { key: keyof M }) => TApi;
} => {
  const resources = tapApiResources(map, getElement, getElementDeps);
  const keys = tapMemo(() => Object.keys(map) as (keyof M)[], [map]);
  const state = tapMemo(() => {
    const result = new Array(keys.length);
    for (let i = 0; i < keys.length; i++) {
      result[i] = resources[keys[i]!].state;
    }
    return result;
  }, [keys, resources]);

  return {
    state,
    api: (lookup: { index: number } | { key: keyof M }) => {
      const value =
        "index" in lookup
          ? resources[keys[lookup.index]!]?.api
          : resources[lookup.key]?.api;

      if (!value) {
        throw new Error(
          `tapLookupResources: Resource not found for lookup: ${JSON.stringify(lookup)}`,
        );
      }

      return value;
    },
  };
};
