import { useEffect, useMemo, useRef } from "react";
import { useResources, withKey, type ResourceElement } from "@assistant-ui/tap";
import type { ClientMethods, InferClientState } from "./types/client";
import {
  ClientResource,
  createClientSubscriptionDependency,
  trackClientSubscriptionDependency,
} from "./useClientResource";

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
  const clientElements = useMemo(
    () =>
      elements.map((el) =>
        withKey(getElementKey(el), ClientResource(el), el.deps),
      ),
    [elements],
  );
  const resources = useResources(clientElements);

  const elementKeys = useMemo(() => elements.map(getElementKey), [elements]);
  const committedElementKeys = useRef(elementKeys);
  const structuralSubscribers = useMemo(() => new Set<() => void>(), []);
  const structuralDependency = useMemo(
    () =>
      createClientSubscriptionDependency((callback) => {
        structuralSubscribers.add(callback);
        return () => structuralSubscribers.delete(callback);
      }),
    [structuralSubscribers],
  );

  useEffect(() => {
    const previous = committedElementKeys.current;
    committedElementKeys.current = elementKeys;
    if (
      previous.length !== elementKeys.length ||
      previous.some((key, index) => key !== elementKeys[index])
    ) {
      // The enclosing client publishes its new methods later in the same
      // commit, so subscribers must observe the completed parent swap.
      queueMicrotask(() => {
        for (const callback of structuralSubscribers) callback();
      });
    }
  }, [elementKeys, structuralSubscribers]);

  useEffect(
    () => () => {
      structuralSubscribers.clear();
    },
    [structuralSubscribers],
  );

  const keyToIndex = useMemo(() => {
    return elements.reduce(
      (acc, element, index) => {
        acc[getElementKey(element)] = index;
        return acc;
      },
      {} as Record<string, number>,
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
        trackClientSubscriptionDependency(structuralDependency);
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
