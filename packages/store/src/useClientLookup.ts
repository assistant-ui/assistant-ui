import { useMemo } from "react";
import { useResources, withKey, type ResourceElement } from "@assistant-ui/tap";
import type { ClientMethods, InferClientState } from "./types/client";
import { ClientResource } from "./useClientResource";

type ElementKey = NonNullable<ResourceElement<unknown>["key"]>;

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
  get: (lookup: { index: number } | { key: ElementKey }) => TMethods;
} {
  const resources = useResources(
    // Forward each element's bailout deps so an unchanged child is reused.
    elements.map((el) =>
      withKey(getElementKey(el), ClientResource(el), el.deps),
    ),
  );

  const keyToIndex = useMemo(() => {
    const map = new Map<ElementKey, number>();
    elements.forEach((element, index) => {
      map.set(getElementKey(element), index);
    });
    return map;
  }, [elements]);

  const state = useMemo(() => {
    return resources.map((r) => r.state);
  }, [resources]);

  return {
    state,
    get: (lookup: { index: number } | { key: ElementKey }) => {
      if ("index" in lookup) {
        if (lookup.index < 0 || lookup.index >= resources.length) {
          throw new Error(
            `useClientLookup: index ${lookup.index} out of bounds (length: ${resources.length}) (ignore if recovered)`,
          );
        }
        return resources[lookup.index]!.methods;
      }

      const index = keyToIndex.get(lookup.key);
      if (index === undefined) {
        throw new Error(
          `useClientLookup: key "${lookup.key}" not found (ignore if recovered)`,
        );
      }
      return resources[index]!.methods;
    },
  };
}
