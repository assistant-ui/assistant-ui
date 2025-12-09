import type { ResourceElement } from "@assistant-ui/tap";
import type { ClientElement, ClientNames } from "./types/client";
import type { DerivedElement } from "./Derived";

/**
 * Symbol used to store default peer clients on a resource.
 */
const DEFAULT_PEERS = Symbol("assistant-ui.default-peers");

/**
 * Type for resources that have default peers attached.
 */
export type ResourceWithDefaultPeers = {
  [DEFAULT_PEERS]?: DefaultPeers;
};

/**
 * Default peers configuration - can be either root clients or derived clients.
 */
export type DefaultPeers = {
  [K in ClientNames]?: ClientElement<K> | DerivedElement<K>;
};

/**
 * Attaches default peer clients to a resource.
 *
 * Default peers are only applied if the scope doesn't exist:
 * - Not defined in parent context
 * - Not provided by user
 * - Not already defined by a previous resource's default peers
 *
 * First definition wins - no overriding is permitted.
 *
 * @param resource - The resource to attach default peers to
 * @param peers - The default peer clients to attach
 * @throws Error if a peer key already exists in the resource's default peers
 *
 * @example
 * ```typescript
 * const ThreadListClient = resource(({ ... }) => { ... });
 *
 * attachDefaultPeers(ThreadListClient, {
 *   // Derived default peers
 *   thread: Derived({ source: "threads", query: { type: "main" }, get: ... }),
 *   threadListItem: Derived({ ... }),
 *   composer: Derived({ getMeta: ..., get: ... }),
 *
 *   // Root default peers
 *   tools: Tools({}),
 *   modelContext: ModelContext({}),
 * });
 * ```
 */
export function attachDefaultPeers<
  T extends (...args: any[]) => ResourceElement<any>,
>(resource: T, peers: DefaultPeers): void {
  const resourceWithPeers = resource as T & ResourceWithDefaultPeers;
  const existing = resourceWithPeers[DEFAULT_PEERS] ?? {};

  for (const key of Object.keys(peers)) {
    if (key in existing) {
      throw new Error(
        `Default peer "${key}" is already attached to this resource`,
      );
    }
  }

  resourceWithPeers[DEFAULT_PEERS] = { ...existing, ...peers };
}

/**
 * Gets the default peers attached to a resource, if any.
 */
export function getDefaultPeers<
  T extends (...args: any[]) => ResourceElement<any>,
>(resource: T): DefaultPeers | undefined {
  return (resource as T & ResourceWithDefaultPeers)[DEFAULT_PEERS];
}
