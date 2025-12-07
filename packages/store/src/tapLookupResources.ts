import { ResourceElement } from "@assistant-ui/tap";
import { ApiObject, tapApiResources } from "./tapApiResource";

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
 * const FooItemResource = resource((): ScopeApi<"foo"> => {
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
export const tapLookupResources = <TState, TApi extends ApiObject>(
  elements: ReadonlyArray<
    readonly [
      key: string | number,
      element: ResourceElement<{
        state: TState;
        api: TApi;
        key?: string;
      }>,
    ]
  >,
): {
  state: TState[];
  api: (lookup: { index: number } | { key: string }) => TApi;
} => {
  const resources = tapApiResources(elements);

  return {
    state: resources.map((r) => r.state),
    api: (lookup: { index: number } | { key: string }) => {
      const value =
        "index" in lookup
          ? resources[lookup.index]?.api
          : resources.find((r) => r.key === lookup.key)?.api;

      if (!value) {
        throw new Error(
          `tapLookupResources: Resource not found for lookup: ${JSON.stringify(lookup)}`,
        );
      }

      return value;
    },
  };
};
