import type { SerializedModelContext } from "../types";

export type { SerializedModelContext } from "../types";

export interface EventLogEntry {
  readonly time: Date;
  readonly event: string;
  readonly data: unknown;
}

export interface ApiInfo {
  id: number;
  state: Record<string, unknown>;
  logs: EventLogEntry[];
  modelContext?: SerializedModelContext | undefined;
  scopes?: unknown;
  /**
   * Cached thread states keyed by thread id. Populated for threads whose runtime
   * has been mounted (visited in the app). Unvisited threads only appear in
   * `state.threads.threadItems`.
   */
  threadSnapshots?: Readonly<Record<string, unknown>>;
}

/**
 * A JSON-safe view of every inspected instance. The map values are stable until
 * the next change so it can be returned directly from useSyncExternalStore.
 */
export interface DevToolsSnapshot {
  apiIds: number[];
  byId: ReadonlyMap<number, ApiInfo>;
}

/**
 * The transport between the data source and the panel UI. The default
 * implementation reads the in-process DevToolsHooks registry, but the panel only
 * depends on this interface, so the same UI can be driven by a postMessage
 * bridge, a browser-extension relay, a remote socket, or a fixture for tests.
 */
export interface DevToolsClient {
  /** Subscribe to snapshot changes; returns an unsubscribe. */
  subscribe(listener: () => void): () => void;
  /** The current snapshot. Must return a stable reference until it changes. */
  getSnapshot(): DevToolsSnapshot;
  /** Snapshot used during SSR/hydration. Defaults to an empty snapshot. */
  getServerSnapshot?(): DevToolsSnapshot;
  /** Clears the buffered event log for an instance. */
  clearEvents(apiId: number): void;
  /** Switches the inspected instance to a thread by id, when supported. */
  switchToThread?(apiId: number, threadId: string): void | Promise<void>;
}

/** Shared stable empty snapshot identity for the empty/server state. */
export const EMPTY_SNAPSHOT: DevToolsSnapshot = { apiIds: [], byId: new Map() };
