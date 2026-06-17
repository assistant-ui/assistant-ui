import { useCallback, useMemo, useSyncExternalStore } from "react";
import { inProcessClient } from "./createInProcessClient";
import { EMPTY_SNAPSHOT, type ApiInfo, type DevToolsClient } from "./types";

export interface DevToolsClientResult {
  apiIds: number[];
  selected: ApiInfo | undefined;
  clearEvents: (apiId: number) => void;
  switchToThread: (apiId: number, threadId: string) => void | Promise<void>;
}

/**
 * Reads a DevToolsClient snapshot and resolves the selected instance. The panel
 * depends only on this, so swapping the client swaps the data source without
 * touching the UI. Pass a stable client reference (the default in-process client
 * is a module singleton; memoize custom clients).
 */
export const useDevToolsClient = (
  selectedApiId: number | null,
  client: DevToolsClient = inProcessClient,
): DevToolsClientResult => {
  // Bind the client methods so class-based or relay clients that rely on `this`
  // work, and keep the references stable so useSyncExternalStore does not
  // resubscribe on every render.
  const store = useMemo(
    () => ({
      subscribe: (listener: () => void) => client.subscribe(listener),
      getSnapshot: () => client.getSnapshot(),
      getServerSnapshot: () =>
        client.getServerSnapshot ? client.getServerSnapshot() : EMPTY_SNAPSHOT,
    }),
    [client],
  );

  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );

  const selected =
    selectedApiId !== null ? snapshot.byId.get(selectedApiId) : undefined;

  const clearEvents = useCallback(
    (apiId: number) => client.clearEvents(apiId),
    [client],
  );

  const switchToThread = useCallback(
    (apiId: number, threadId: string) => {
      if (client.switchToThread) {
        return client.switchToThread(apiId, threadId);
      }
    },
    [client],
  );

  return { apiIds: snapshot.apiIds, selected, clearEvents, switchToThread };
};
