import type { AssistantClients } from "./types";
import type { ResourceElement } from "@assistant-ui/tap";

type ClientRegistryEntry<K extends keyof AssistantClients> = {
  name: K;
  defaultInitialize:
    | ResourceElement<AssistantClients[K]["methods"]>
    | { error: string };
};

const clientRegistry = new Map<
  keyof AssistantClients,
  ResourceElement<any> | { error: string }
>();

/**
 * Register a default client implementation.
 * This allows clients to have default values when not explicitly provided.
 *
 * @example With a resource:
 * ```typescript
 * registerClient({
 *   name: "myClient",
 *   defaultInitialize: MyResource(),
 * });
 * ```
 *
 * @example With an error:
 * ```typescript
 * registerClient({
 *   name: "myClient",
 *   defaultInitialize: { error: "MyClient is not configured" },
 * });
 * ```
 */
export function registerClient<K extends keyof AssistantClients>(
  config: ClientRegistryEntry<K>,
): void {
  clientRegistry.set(config.name, config.defaultInitialize);
}

/**
 * Get the default initializer for a client, if registered.
 */
export function getDefaultClientInitializer<K extends keyof AssistantClients>(
  name: K,
):
  | (ResourceElement<AssistantClients[K]["methods"]> | { error: string })
  | undefined {
  return clientRegistry.get(name);
}

/**
 * Check if a client has been registered.
 */
export function hasRegisteredClient(name: keyof AssistantClients): boolean {
  return clientRegistry.has(name);
}
