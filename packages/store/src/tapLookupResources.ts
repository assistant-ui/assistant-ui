import { ResourceElement, tapResources } from "@assistant-ui/tap";
import { ApiObject } from "./tapApi";

/**
 * Creates a lookup-based resource collection for managing lists of items.
 * Returns both the combined state array and an API function to lookup specific items.
 *
 * @param elements - Array of resource elements, each returning { key, state, api }
 * @returns Object with { state: TState[], api: (lookup) => TApi }
 *
 * The api function accepts { index: number } or { key: string } for lookups.
 * Consumers can wrap it to rename the key field (e.g., to "id" or "toolCallId").
 *
 * @example
 * ```typescript
 * const foos = tapLookupResources(
 *   items.map((item) => FooItem({ id: item.id }, { key: item.id }))
 * );
 *
 * // Access state array
 * const allStates = foos.state;
 *
 * // Wrap to rename key field to "id"
 * const wrappedApi = (lookup: { index: number } | { id: string }) => {
 *   if ("id" in lookup) {
 *     return foos.api({ key: lookup.id });
 *   } else {
 *     return foos.api(lookup);
 *   }
 * };
 * ```
 */
export const tapLookupResources = <TState, TApi extends ApiObject>(
  elements: ResourceElement<{
    key: string | undefined;
    state: TState;
    api: TApi;
  }>[],
): {
  state: TState[];
  api: (lookup: { index: number } | { key: string }) => TApi;
} => {
  const resources = tapResources(elements);

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
