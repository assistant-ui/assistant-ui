import { Derived } from "../Derived";
import type { Client, ClientNames } from "../types/client";
import type { useAssistantClient } from "../useAssistantClient";

export type RootClients = Partial<Record<ClientNames, Client<ClientNames>>>;
export type DerivedClients = Partial<Record<ClientNames, Derived<ClientNames>>>;

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
export function splitClients(clients: useAssistantClient.Props) {
  const rootClients: RootClients = {};
  const derivedClients: DerivedClients = {};

  for (const [key, clientElement] of Object.entries(clients) as [
    keyof useAssistantClient.Props,
    NonNullable<useAssistantClient.Props[keyof useAssistantClient.Props]>,
  ][]) {
    if (clientElement.type === Derived) {
      derivedClients[key] = clientElement as Derived<ClientNames>;
    } else {
      rootClients[key] = clientElement as Client<ClientNames>;
    }
  }

  return { rootClients, derivedClients };
}
