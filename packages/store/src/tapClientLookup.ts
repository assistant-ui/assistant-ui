import { ResourceElement, tapMemo, tapResources } from "@assistant-ui/tap";
import type { ClientMethods, ClientOutputOf } from "./types/client";
import { ClientResource } from "./tapClientResource";

export const tapClientLookup = <
  TState,
  TMethods extends ClientMethods,
  M extends Record<string | number | symbol, any>,
>(
  map: M,
  getElement: (
    t: M[keyof M],
    key: keyof M,
  ) => ResourceElement<ClientOutputOf<TState, TMethods>>,
  getElementDeps: any[],
): {
  state: TState[];
  get: (lookup: { index: number } | { key: keyof M }) => TMethods;
} => {
  const resources = tapResources(
    map,
    (t, key) => ClientResource(getElement(t, key)),
    getElementDeps,
  );
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
    get: (lookup: { index: number } | { key: keyof M }) => {
      const value =
        "index" in lookup
          ? resources[keys[lookup.index]!]
          : resources[lookup.key];

      if (!value) {
        throw new Error(
          `tapClientLookup: Resource not found for lookup: ${JSON.stringify(lookup)}`,
        );
      }

      return value.methods;
    },
  };
};
