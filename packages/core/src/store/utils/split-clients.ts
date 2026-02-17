import { Derived, DerivedElement } from "./derived";
import type {
  AssistantClient,
  ClientElement,
  ClientNames,
} from "../types/client";
import {
  getTransformScopes,
  type ScopesConfig,
} from "./attach-transform-scopes";
import { tapMemo } from "@assistant-ui/tap";

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
function splitClients(clients: ScopesConfig, baseClient: AssistantClient) {
  // 1. Collect transforms from root elements and run them iteratively
  let scopes = { ...clients } as Record<
    string,
    ClientElement<ClientNames> | DerivedElement<ClientNames>
  >;
  const visited = new Set<(...args: any[]) => any>();

  let changed = true;
  while (changed) {
    changed = false;
    for (const clientElement of Object.values(scopes)) {
      if (clientElement.type === (Derived as unknown)) continue;
      if (visited.has(clientElement.type)) continue;
      visited.add(clientElement.type);

      const transform = getTransformScopes(clientElement.type);
      if (transform) {
        scopes = transform(scopes, baseClient) as typeof scopes;
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
    if (clientElement.type === (Derived as unknown)) {
      derivedClients[key] = clientElement as DerivedElement<ClientNames>;
    } else {
      rootClients[key] = clientElement as ClientElement<ClientNames>;
    }
  }

  return { rootClients, derivedClients };
}

const tapShallowMemoObject = <T extends object>(object: T) => {
  // biome-ignore lint/correctness/useExhaustiveDependencies: shallow memo
  return tapMemo(() => object, [...Object.entries(object).flat()]);
};

export const tapSplitClients = (
  clients: ScopesConfig,
  baseClient: AssistantClient,
) => {
  const { rootClients, derivedClients } = splitClients(clients, baseClient);

  return {
    rootClients: tapShallowMemoObject(rootClients),
    derivedClients: tapShallowMemoObject(derivedClients),
  };
};
