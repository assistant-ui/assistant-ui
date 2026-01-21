import {
  tapInlineResource,
  tapMemo,
  tapResources,
  type ResourceElement,
} from "@assistant-ui/tap";
import type { ClientMethods, ClientOutputOf } from "./types/client";
import { ClientResource } from "./tapClientResource";
import { wrapperResource } from "./wrapperResource";

const ClientResourceWithKey = wrapperResource(
  <TState, TMethods extends ClientMethods>(
    el: ResourceElement<ClientOutputOf<TState, TMethods>>,
  ) => {
    if (el.key === undefined) {
      throw new Error("tapClientResource: Element has no key");
    }
    return tapInlineResource(ClientResource(el)) as ClientOutputOf<
      TState,
      TMethods
    > & { key: string | number };
  },
);

export function tapClientLookup<TState, TMethods extends ClientMethods>(
  getElements: () => readonly ResourceElement<
    ClientOutputOf<TState, TMethods>
  >[],
  getElementsDeps: readonly unknown[],
): {
  state: TState[];
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
