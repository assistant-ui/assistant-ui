import { ResourceElement, tapResources } from "@assistant-ui/tap";
import { ActionsObject } from "../../utils/tap-store";
import { StoreApi } from "../../utils/tap-store/tap-store-api";

export const tapLookupResources = <TState, TActions extends ActionsObject>(
  elements: ResourceElement<{
    key?: string | undefined;
    state: TState;
    api: StoreApi<TState, TActions>;
  }>[],
) => {
  const resources = tapResources(elements);

  return {
    state: resources.map((r) => r.state),
    api: (lookup: { index: number } | { key: string }) => {
      if ("index" in lookup) {
        return resources[lookup.index]!.api;
      } else {
        return resources.find((r) => r.key === lookup.key)!.api;
      }
    },
  };
};
