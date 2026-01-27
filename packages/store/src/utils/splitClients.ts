import { Derived, DerivedElement } from "../Derived";
import type {
  AssistantClient,
  ClientElement,
  ClientNames,
} from "../types/client";
import { getDefaultPeers } from "../attachDefaultPeers";
import type { useAui } from "../useAui";
import { tapMemo } from "@assistant-ui/tap";

export type RootClients = Partial<
  Record<ClientNames, ClientElement<ClientNames>>
>;
export type DerivedClients = Partial<
  Record<ClientNames, DerivedElement<ClientNames>>
>;

/**
 * Splits a clients object into root clients and derived clients.
 *
 * @param clients - The clients input object to split
 * @returns An object with { rootClients, derivedClients }
 *
 * @example
 * ```typescript
 * const clients = {
 *   foo: RootClient({ ... }),
 *   bar: Derived({ ... }),
 * };
 *
 * const { rootClients, derivedClients } = splitClients(clients);
 * // rootClients = { foo: ... }
 * // derivedClients = { bar: ... }
 * ```
 */
function splitClients(clients: useAui.Props, baseClient: AssistantClient) {
  const rootClients: RootClients = {};
  const derivedClients: DerivedClients = {};

  for (const [key, clientElement] of Object.entries(clients) as [
    keyof useAui.Props,
    NonNullable<useAui.Props[keyof useAui.Props]>,
  ][]) {
    if (clientElement.type === Derived) {
      derivedClients[key] = clientElement as DerivedElement<ClientNames>;
    } else {
      rootClients[key] = clientElement as ClientElement<ClientNames>;
    }
  }

  // Recursively gather all default peers, flattening nested ones
  const gatherDefaultPeers = (
    clientElement: ClientElement<ClientNames>,
    visited = new Set<ClientElement<ClientNames>>(),
  ): Array<
    [ClientNames, ClientElement<ClientNames> | DerivedElement<ClientNames>]
  > => {
    // Prevent infinite loops
    if (visited.has(clientElement)) return [];
    visited.add(clientElement);

    const defaultPeers = getDefaultPeers(clientElement.type);
    if (!defaultPeers) return [];

    const result: Array<
      [ClientNames, ClientElement<ClientNames> | DerivedElement<ClientNames>]
    > = [];

    for (const [key, peerElement] of Object.entries(defaultPeers) as [
      ClientNames,
      ClientElement<ClientNames> | DerivedElement<ClientNames>,
    ][]) {
      result.push([key, peerElement]);

      // If this peer is a root client with its own default peers, recursively gather them
      if (peerElement.type !== Derived<ClientNames>) {
        const nestedPeers = gatherDefaultPeers(
          peerElement as ClientElement<ClientNames>,
          visited,
        );
        result.push(...nestedPeers);
      }
    }

    return result;
  };

  // Apply flattened default peers for each root client
  for (const [_clientKey, clientElement] of Object.entries(rootClients) as [
    ClientNames,
    ClientElement<ClientNames>,
  ][]) {
    const allPeers = gatherDefaultPeers(clientElement);

    for (const [key, peerElement] of allPeers) {
      // Skip if already exists (first wins)
      if (
        key in rootClients ||
        key in derivedClients ||
        baseClient[key].source !== null
      )
        continue;

      if (peerElement.type === Derived<ClientNames>) {
        derivedClients[key] = peerElement as DerivedElement<ClientNames>;
      } else {
        rootClients[key] = peerElement as ClientElement<ClientNames>;
      }
    }
  }

  return { rootClients, derivedClients };
}

const tapShallowMemoObject = <T extends object>(object: T) => {
  // biome-ignore lint/correctness/useExhaustiveDependencies: shallow memo
  return tapMemo(() => object, [...Object.entries(object).flat()]);
};

export const tapSplitClients = (
  clients: useAui.Props,
  baseClient: AssistantClient,
) => {
  const { rootClients, derivedClients } = splitClients(clients, baseClient);

  return {
    rootClients: tapShallowMemoObject(rootClients),
    derivedClients: tapShallowMemoObject(derivedClients),
  };
};
