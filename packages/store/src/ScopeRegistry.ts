import type { AssistantScopes } from "./types";
import type { ResourceElement } from "@assistant-ui/tap";

type ScopeRegistryEntry<K extends keyof AssistantScopes> = {
  name: K;
  defaultInitialize:
    | ResourceElement<AssistantScopes[K]["value"]>
    | { error: string };
};

const scopeRegistry = new Map<
  keyof AssistantScopes,
  ResourceElement<any> | { error: string }
>();

/**
 * Register a default scope implementation.
 * This allows scopes to have default values when not explicitly provided.
 *
 * @example With a resource:
 * ```typescript
 * registerAssistantScope({
 *   name: "myScope",
 *   defaultInitialize: MyResource(),
 * });
 * ```
 *
 * @example With an error:
 * ```typescript
 * registerAssistantScope({
 *   name: "myScope",
 *   defaultInitialize: { error: "MyScope is not configured" },
 * });
 * ```
 */
export function registerAssistantScope<K extends keyof AssistantScopes>(
  config: ScopeRegistryEntry<K>,
): void {
  scopeRegistry.set(config.name, config.defaultInitialize);
}

/**
 * Get the default initializer for a scope, if registered.
 */
export function getDefaultScopeInitializer<K extends keyof AssistantScopes>(
  name: K,
):
  | (ResourceElement<AssistantScopes[K]["value"]> | { error: string })
  | undefined {
  return scopeRegistry.get(name);
}

/**
 * Get all registered scope names.
 */
export function getRegisteredScopes(): (keyof AssistantScopes)[] {
  return Array.from(scopeRegistry.keys());
}
