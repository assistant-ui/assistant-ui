import { tapMemo, tapResources, type ResourceElement } from "@assistant-ui/tap";
import type { ClientMethods, ClientOutputOf } from "./types/client";
import { ClientResource } from "./tapClientResource";

type ResourceResult = { state: unknown; methods: ClientMethods };

type ExtractClientState<E> =
  E extends ResourceElement<ClientOutputOf<infer TState, any>, any>
    ? TState
    : never;

type ExtractClientMethods<E> =
  E extends ResourceElement<ClientOutputOf<any, infer TMethods>, any>
    ? TMethods
    : never;

export function tapClientLookup<
  E extends ResourceElement<ClientOutputOf<any, any>>,
  M extends readonly any[],
>(
  arr: M,
  getElement: (t: M[number], key: string) => E,
  getElementDeps: readonly any[],
): {
  state: ExtractClientState<E>[];
  get: (lookup: { index: number } | { key: string }) => ExtractClientMethods<E>;
};
export function tapClientLookup<
  TState,
  TMethods extends ClientMethods,
  M extends Readonly<Record<string, any>>,
>(
  map: M,
  getElement: <K extends keyof M>(
    t: M[K],
    key: K,
  ) => ResourceElement<ClientOutputOf<TState, TMethods>>,
  getElementDeps: readonly any[],
): {
  state: TState[];
  get: (lookup: { index: number } | { key: keyof M }) => TMethods;
};

// Implementation
export function tapClientLookup(
  map: Readonly<Record<string, unknown>> | readonly unknown[],
  getElement: (
    t: unknown,
    key: string,
  ) => ResourceElement<ClientOutputOf<unknown, ClientMethods>>,
  getElementDeps: readonly unknown[],
): {
  state: unknown[];
  get: (lookup: { index: number } | { key: string }) => ClientMethods;
} {
  const isArray = Array.isArray(map);

  const resources = tapResources(
    map as Readonly<Record<string, unknown>>,
    (t, key) => ClientResource(getElement(t, key)),
    getElementDeps,
  ) as unknown as ResourceResult[] | Record<string, ResourceResult>;

  const keys = tapMemo(() => Object.keys(map), [map]);

  // For arrays, track element key -> index mapping
  const keyToIndex = tapMemo(() => {
    if (!isArray) return null;
    const mapping: Record<string, number> = {};
    const arr = map as readonly unknown[];
    for (let i = 0; i < arr.length; i++) {
      const element = getElement(arr[i], String(i));
      if (element.key !== undefined) {
        mapping[element.key] = i;
      }
    }
    return mapping;
  }, [isArray, resources, map, getElement]);

  const state = tapMemo(() => {
    if (isArray) {
      return (resources as ResourceResult[]).map((r) => r.state);
    }
    const result = new Array(keys.length);
    const rec = resources as Record<string, ResourceResult>;
    for (let i = 0; i < keys.length; i++) {
      result[i] = rec[keys[i]!]!.state;
    }
    return result;
  }, [isArray, keys, resources]);

  return {
    state,
    get: (lookup: { index: number } | { key: string }) => {
      if ("index" in lookup) {
        if (lookup.index < 0 || lookup.index >= keys.length) {
          throw new Error(
            `tapClientLookup: Index ${lookup.index} out of bounds (length: ${keys.length})`,
          );
        }
        if (isArray) {
          return (resources as ResourceResult[])[lookup.index]!.methods;
        }
        return (resources as Record<string, ResourceResult>)[
          keys[lookup.index]!
        ]!.methods;
      }

      if (isArray) {
        const index = keyToIndex![lookup.key];
        if (index === undefined) {
          throw new Error(`tapClientLookup: Key "${lookup.key}" not found`);
        }
        return (resources as ResourceResult[])[index]!.methods;
      }

      const value = (resources as Record<string, ResourceResult>)[lookup.key];
      if (!value) {
        throw new Error(`tapClientLookup: Key "${lookup.key}" not found`);
      }
      return value.methods;
    },
  };
}
