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
      if ("index" in lookup) {
        if (lookup.index < 0 || lookup.index >= keys.length) {
          throw new Error(
            `tapClientLookup: Index ${lookup.index} out of bounds (length: ${keys.length})`,
          );
        }
        return resources[keys[lookup.index]!]!.methods;
      }

      const value = resources[lookup.key];
      if (!value) {
        throw new Error(
          `tapClientLookup: Key "${String(lookup.key)}" not found`,
        );
      }
      return value.methods;
    },
  };
};
