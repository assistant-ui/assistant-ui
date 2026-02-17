import {
  tapMemo,
  tapResource,
  tapResources,
  type ResourceElement,
} from "@assistant-ui/tap";
import type { ClientMethods } from "./types/client";
import { ClientResource } from "./tap-client-resource";
import { wrapperResource } from "./wrapper-resource";

type InferClientState<TMethods> = TMethods extends {
  getState: () => infer S;
}
  ? S
  : unknown;

const ClientResourceWithKey = wrapperResource(
  <TMethods extends ClientMethods>(el: ResourceElement<TMethods>) => {
    if (el.key === undefined) {
      throw new Error("tapClientResource: Element has no key");
    }
    return tapResource(ClientResource(el)) as {
      methods: TMethods;
      state: InferClientState<TMethods>;
      key: string | number;
    };
  },
);

export function tapClientLookup<TMethods extends ClientMethods>(
  getElements: () => readonly ResourceElement<TMethods>[],
  getElementsDeps: readonly unknown[],
): {
  state: InferClientState<TMethods>[];
  get: (lookup: { index: number } | { key: string }) => TMethods;
} {
  const resources = tapResources(
    () => getElements().map((el) => ClientResourceWithKey(el)),
    // biome-ignore lint/correctness/useExhaustiveDependencies: getElementsDeps is passed through from caller
    getElementsDeps,
  );

  const keys = tapMemo(() => Object.keys(resources), [resources]);

  // For arrays, track element key -> index mapping
  const keyToIndex = tapMemo(() => {
    return resources.reduce(
      (acc, resource, index) => {
        acc[resource.key] = index;
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [resources]);

  const state = tapMemo(() => {
    return resources.map((r) => r.state);
  }, [resources]);

  return {
    state,
    get: (lookup: { index: number } | { key: string }) => {
      if ("index" in lookup) {
        if (lookup.index < 0 || lookup.index >= keys.length) {
          throw new Error(
            `tapClientLookup: Index ${lookup.index} out of bounds (length: ${keys.length})`,
          );
        }
        return resources[lookup.index]!.methods;
      }

      const index = keyToIndex[lookup.key];
      if (index === undefined) {
        throw new Error(`tapClientLookup: Key "${lookup.key}" not found`);
      }
      return resources[index]!.methods;
    },
  };
}
