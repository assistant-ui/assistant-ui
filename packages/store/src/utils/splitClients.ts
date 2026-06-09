import { useDerived, type DerivedElement } from "../Derived";
import type {
  AssistantClient,
  ClientElement,
  ClientNames,
} from "../types/client";
import { getTransformScopes } from "../attachTransformScopes";
import type { useAui } from "../useAui";
import { useMemo } from "react";

export type RootClients = Partial<
  Record<ClientNames, ClientElement<ClientNames>>
>;
export type DerivedClients = Partial<
  Record<ClientNames, DerivedElement<ClientNames>>
>;

/**
 * Splits a clients object into root clients and derived clients,
 * applying transformScopes from root client elements.
 */
function splitClients(clients: useAui.Props, baseClient: AssistantClient) {
  // 1. Collect transforms from root elements and run them iteratively
  const scopes = { ...clients } as Record<
    string,
    ClientElement<ClientNames> | DerivedElement<ClientNames>
  >;
  const visited = new Set<(...args: any[]) => any>();

  let changed = true;
  while (changed) {
    changed = false;
    for (const clientElement of Object.values(scopes)) {
      if (clientElement.hook === (useDerived as unknown)) continue;
      if (visited.has(clientElement.hook)) continue;
      visited.add(clientElement.hook);

      const transform = getTransformScopes(clientElement.hook);
      if (transform) {
        transform(scopes, baseClient);
        changed = true;
        break; // restart iteration since scopes may have new root elements
      }
    }
  }

  // 2. Split result into root/derived
  const rootClients: RootClients = {};
  const derivedClients: DerivedClients = {};

  for (const [key, clientElement] of Object.entries(scopes) as [
    ClientNames,
    ClientElement<ClientNames> | DerivedElement<ClientNames>,
  ][]) {
    if (clientElement.hook === (useDerived as unknown)) {
      derivedClients[key] = clientElement as DerivedElement<ClientNames>;
    } else {
      rootClients[key] = clientElement as ClientElement<ClientNames>;
    }
  }

  return { rootClients, derivedClients };
}

const useShallowMemoObject = <T extends object>(object: T) => {
  // oxlint-disable-next-line react/exhaustive-deps -- shallow memo over the object's flattened entries
  return useMemo(() => object, [...Object.entries(object).flat()]);
};

export const useSplitClients = (
  clients: useAui.Props,
  baseClient: AssistantClient,
) => {
  const { rootClients, derivedClients } = splitClients(clients, baseClient);

  return {
    rootClients: useShallowMemoObject(rootClients),
    derivedClients: useShallowMemoObject(derivedClients),
  };
};
