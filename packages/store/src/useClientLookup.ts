import { useMemo } from "react";
import { useResources, withKey, type ResourceElement } from "@assistant-ui/tap";
import type { ClientMethods, InferClientState } from "./types/client";
import { ClientResource } from "./useClientResource";

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

  const keyToIndex = useMemo(() => {
    return elements.reduce(
      (acc, element, index) => {
        acc[getElementKey(element)] = index;
        return acc;
      },
      Object.create(null) as Record<string, number>,
    );
  }, [elements]);

  const state = useMemo(() => {
    return resources.map((r) => r.state);
  }, [resources]);

  return {
    state,
    get: (lookup: { index: number } | { key: string }) => {
      if ("index" in lookup) {
        if (lookup.index < 0 || lookup.index >= resources.length) {
          throw new Error(
            `useClientLookup: index ${lookup.index} out of bounds (length: ${resources.length}) (ignore if recovered)`,
          );
        }
        return resources[lookup.index]!.methods;
      }

      const index = keyToIndex[lookup.key];
      if (index === undefined) {
        throw new Error(
          `useClientLookup: key "${lookup.key}" not found (ignore if recovered)`,
        );
      }
      return resources[index]!.methods;
    },
  };
}
