import { Derived, DerivedElement } from "../Derived";
import type {
  AssistantClient,
  ClientElement,
  ClientNames,
} from "../types/client";
import { getDefaultPeers } from "../attachDefaultPeers";
import type { useAssistantClient } from "../useAssistantClient";

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
export function splitClients(
  clients: useAssistantClient.Props,
  baseClient: AssistantClient,
) {
  const rootClients: RootClients = {};
  const derivedClients: DerivedClients = {};

  for (const [key, clientElement] of Object.entries(clients) as [
    keyof useAssistantClient.Props,
    NonNullable<useAssistantClient.Props[keyof useAssistantClient.Props]>,
  ][]) {
    if (clientElement.type === Derived) {
      derivedClients[key] = clientElement as DerivedElement<ClientNames>;
    } else {
      rootClients[key] = clientElement as ClientElement<ClientNames>;
    }
  }

  for (const [clientKey, clientElement] of Object.entries(rootClients) as [
    ClientNames,
    ClientElement<ClientNames>,
  ][]) {
    const defaultPeers = getDefaultPeers(clientElement.type);
    if (!defaultPeers) continue;

    for (const [key, peerElement] of Object.entries(defaultPeers) as [
      ClientNames,
      ClientElement<ClientNames> | DerivedElement<ClientNames>,
    ][]) {
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
        const subDefaultPeers = getDefaultPeers(peerElement.type);
        if (subDefaultPeers)
          throw new Error(
            `Nested default peers are not supported. Client "${clientKey}" has default peers, but its peer "${key}" also has default peers.`,
          );
      }
    }
  }

  return { rootClients, derivedClients };
}
