import { ResourceElement, tapResources } from "@assistant-ui/tap";
import { ApiObject } from "../../utils/tap-store";

export const tapLookupResources = <TState, TApi extends ApiObject>(
  elements: ResourceElement<{
    key: string | undefined;
    state: TState;
    api: TApi;
  }>[],
) => {
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
