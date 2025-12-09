import { ResourceElement, tapMemo, tapResources } from "@assistant-ui/tap";
import { ApiObject } from "../../utils/tap-store";

export const tapLookupResources = <TState, TApi extends ApiObject>(
  elements: readonly ResourceElement<{
    key: string | undefined;
    state: TState;
    api: TApi;
  }>[],
): {
  state: TState[];
  api: (lookup: { index: number } | { key: string }) => TApi;
} => {
  const resources = tapResources(elements, (t) => t, []);
  const indexForKeys = tapMemo(
    () => Object.fromEntries(elements.map((e, idx) => [e.key!, idx])),
    [elements],
  );
  const state = tapMemo(() => resources.map((r) => r.state), [resources]);

  return {
    state,
    api: (lookup: { index: number } | { key: string }) => {
      const value =
        "index" in lookup
          ? resources[lookup.index]?.api
          : resources[indexForKeys[lookup.key]!]?.api;

      if (!value) {
        throw new Error(
          `tapLookupResources: Resource not found for lookup: ${JSON.stringify(lookup)}`,
        );
      }

      return value;
    },
  };
};
