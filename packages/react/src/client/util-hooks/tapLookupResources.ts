import { ResourceElement, tapMemo, tapResources } from "@assistant-ui/tap";
import { ApiObject } from "../../utils/tap-store";

export const tapLookupResources = <TState, TApi extends ApiObject>(
  elements: readonly (readonly [
    string,
    ResourceElement<{
      key: string | undefined;
      state: TState;
      api: TApi;
    }>,
  ])[],
): {
  state: TState[];
  api: (lookup: { index: number } | { key: string }) => TApi;
} => {
  const elementsMap = tapMemo(() => Object.fromEntries(elements), [elements]);
  const resources = tapResources(elementsMap, (t) => t, []);
  const keys = tapMemo(() => Object.keys(resources), [resources]);
  const state = tapMemo(() => {
    const result = new Array(keys.length);
    for (let i = 0; i < keys.length; i++) {
      result[i] = resources[keys[i]!]!.state;
    }
    return result;
  }, [keys, resources]);

  return {
    state,
    api: (lookup: { index: number } | { key: string }) => {
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
