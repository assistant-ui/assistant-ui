import { useMemo, useSyncExternalStore, useDebugValue } from "react";
import type { AssistantClient, AssistantState } from "./types/client";
import { useAssistantClient } from "./useAssistantClient";
import { getClientState } from "./utils/ClientResource";

/**
 * Proxied state that lazily accesses scope states
 */
class ProxiedAssistantState {
  #client: AssistantClient;

  constructor(client: AssistantClient) {
    this.#client = client;
  }

  #getScope<K extends keyof AssistantState>(key: K): AssistantState[K] {
    const scopeField = this.#client[key];
    if (!scopeField) {
      throw new Error(`Scope "${String(key)}" not found in client`);
    }

    return getClientState(scopeField());
  }

  // Create a Proxy to dynamically handle property access
  static create(client: AssistantClient): AssistantState {
    const instance = new ProxiedAssistantState(client);
    return new Proxy(instance, {
      get(target, prop) {
        if (typeof prop === "string" && prop in client) {
          return target.#getScope(prop as keyof AssistantState);
        }
        return undefined;
      },
    }) as unknown as AssistantState;
  }
}

/**
 * Hook to access a slice of the assistant state with automatic subscription
 *
 * @param selector - Function to select a slice of the state
 * @returns The selected state slice
 *
 * @example
 * ```typescript
 * const client = useAssistantClient({
 *   foo: RootScope({ ... }),
 * });
 *
 * const bar = useAssistantState((state) => state.foo.bar);
 * ```
 */
export const useAssistantState = <T,>(
  selector: (state: AssistantState) => T,
): T => {
  const client = useAssistantClient();

  const proxiedState = useMemo(
    () => ProxiedAssistantState.create(client),
    [client],
  );

  const slice = useSyncExternalStore(
    client.subscribe,
    () => selector(proxiedState),
    () => selector(proxiedState),
  );

  useDebugValue(slice);

  if (slice instanceof ProxiedAssistantState) {
    throw new Error(
      "You tried to return the entire AssistantState. This is not supported due to technical limitations.",
    );
  }

  return slice;
};
