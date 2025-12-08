import { ResourceElement, tapMemo } from "@assistant-ui/tap";
import { tapClientResources } from "./tapClientResource";
import type { ClientMethods, ClientResourceOutputOf } from "./types";
import { getClientState } from "./tapClientResource";

export const tapClientLookup = <
  TState,
  TMethods extends ClientMethods,
  M extends Record<string | number | symbol, any>,
>(
  map: M,
  getElement: (
    t: M[keyof M],
    key: keyof M,
  ) => ResourceElement<ClientResourceOutputOf<TState, TMethods>>,
  getElementDeps?: any[],
): {
  state: TState[];
  get: (lookup: { index: number } | { key: keyof M }) => TMethods;
} => {
  const resources = tapClientResources(map, getElement, getElementDeps);
  const keys = tapMemo(() => Object.keys(map) as (keyof M)[], [map]);

  const state = tapMemo(() => {
    const result = new Array(keys.length);
    for (let i = 0; i < keys.length; i++) {
      result[i] = getClientState(resources[keys[i]!].methods);
    }
    return result;
  }, [keys, resources]);

  return {
    state,
    get: (lookup: { index: number } | { key: keyof M }) => {
      const value =
        "index" in lookup
          ? resources[keys[lookup.index]!]?.methods
          : resources[lookup.key]?.methods;

      if (!value) {
        throw new Error(
          `tapClientLookup: Resource not found for lookup: ${JSON.stringify(lookup)}`,
        );
      }

      return value;
    },
  };
};
