import { DerivedClient } from "../DerivedClient";
import type { AssistantClients, ClientInput, ClientsInput } from "../types";

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
 *   bar: DerivedClient({ ... }),
 * };
 *
 * const { rootClients, derivedClients } = splitClients(clients);
 * // rootClients = { foo: ... }
 * // derivedClients = { bar: ... }
 * ```
 */
export function splitClients(clients: ClientsInput) {
  const rootClients: ClientsInput = {};
  const derivedClients: ClientsInput = {};

  for (const [key, clientElement] of Object.entries(clients) as [
    keyof ClientsInput,
    ClientInput<AssistantClients[keyof ClientsInput]>,
  ][]) {
    if (clientElement.type === DerivedClient) {
      derivedClients[key] = clientElement;
    } else {
      rootClients[key] = clientElement;
    }
  }

  return { rootClients, derivedClients };
}
