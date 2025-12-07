import { ResourceElement, tapMemo } from "@assistant-ui/tap";
import { tapClientResources } from "./tapClientResource";
import type { ClientObject, ScopeOutputOf } from "./types";

/**
 * Creates a lookup-based resource collection for managing lists of items.
 * Returns both the combined state array and a client function to lookup specific items.
 *
 * Resources should return plain objects with { state, client }.
 * This function internally wraps each element with tapClientResource to create
 * stable client proxies.
 *
 * @param elements - Array of [key, element] tuples, each element returning { state, client }
 * @returns Object with { state: TState[], client: (lookup) => TClient }
 *
 * The client function accepts { index: number } or { key: string } for lookups.
 * Consumers can wrap it to rename the key field (e.g., to "id" or "toolCallId").
 *
 * @example
 * ```typescript
 * const FooItemResource = resource((): ScopeOutput<"foo"> => {
 *   const [state, setState] = tapState({ id, bar });
 *   return { state, client: { updateBar, remove } };
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
 * const first = foos.client({ index: 0 });
 * const byKey = foos.client({ key: "foo-1" });
 * ```
 */
export const tapLookupResources = <
  TState,
  TClient extends ClientObject,
  M extends Record<string | number | symbol, any>,
>(
  map: M,
  getElement: (
    t: M[keyof M],
    key: keyof M,
  ) => ResourceElement<ScopeOutputOf<TState, TClient>>,
  getElementDeps?: any[],
): {
  state: TState[];
  client: (lookup: { index: number } | { key: keyof M }) => TClient;
} => {
  const resources = tapClientResources(map, getElement, getElementDeps);
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
    client: (lookup: { index: number } | { key: keyof M }) => {
      const value =
        "index" in lookup
          ? resources[keys[lookup.index]!]?.client
          : resources[lookup.key]?.client;

      if (!value) {
        throw new Error(
          `tapLookupResources: Resource not found for lookup: ${JSON.stringify(lookup)}`,
        );
      }

      return value;
    },
  };
};
