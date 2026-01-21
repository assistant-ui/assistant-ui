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
  const resources = tapResources(() => elements, [elements]);
  const indexByKey = tapMemo(
    () => Object.fromEntries(elements.map((el, idx) => [el.key!, idx])),
    [elements],
  );
  const state = tapMemo(() => {
    return resources.map((el) => el.state);
  }, [resources]);

  return {
    state,
    api: (lookup: { index: number } | { key: string }) => {
      const value =
        "index" in lookup
          ? resources[lookup.index]?.api
          : resources[indexByKey[lookup.key]!]?.api;

      if (!value) {
        throw new Error(
          `tapLookupResources: Resource not found for lookup: ${JSON.stringify(lookup)}`,
        );
      }

      return value;
    },
  };
};
