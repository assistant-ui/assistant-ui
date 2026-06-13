import { useMemo } from "react";
import { useResources, withKey, type ResourceElement } from "@assistant-ui/tap";
import type { ClientMethods } from "./types/client";
import { ClientResource } from "./useClientResource";

type InferClientState<TMethods> = TMethods extends {
  getState: () => infer S;
}
  ? S
  : unknown;

const getElementKey = (el: ResourceElement<unknown>) => {
  if (el.key === undefined) {
    throw new Error("useClientLookup: Element has no key");
  }
  return el.key;
};

export function useClientLookup<TMethods extends ClientMethods>(
  elements: readonly ResourceElement<TMethods>[],
): {
  state: InferClientState<TMethods>[];
  get: (lookup: { index: number } | { key: string }) => TMethods;
} {
  const resources = useResources(
    // Forward each element's bailout deps so an unchanged child is reused.
    elements.map((el) =>
      withKey(getElementKey(el), ClientResource(el), el.deps),
    ),
  );

  const keys = useMemo(() => Object.keys(resources), [resources]);

  // For arrays, track element key -> index mapping
  const keyToIndex = useMemo(() => {
    return resources.reduce(
      (acc, resource, index) => {
        acc[resource.key!] = index;
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [resources]);

  const state = useMemo(() => {
    return resources.map((r) => r.state);
  }, [resources]);

  return {
    state,
    get: (lookup: { index: number } | { key: string }) => {
      if ("index" in lookup) {
        if (lookup.index < 0 || lookup.index >= keys.length) {
          throw new Error(
            `useClientLookup: Index ${lookup.index} out of bounds (length: ${keys.length})`,
          );
        }
        return resources[lookup.index]!.methods;
      }

      const index = keyToIndex[lookup.key];
      if (index === undefined) {
        throw new Error(`useClientLookup: Key "${lookup.key}" not found`);
      }
      return resources[index]!.methods;
    },
  };
}
