import { useCallback, useSyncExternalStore } from "react";
import { inProcessClient } from "./createInProcessClient";
import type { ApiInfo, DevToolsClient, DevToolsSnapshot } from "./types";

const EMPTY_SNAPSHOT: DevToolsSnapshot = { apiIds: [], byId: new Map() };
const getEmptySnapshot = () => EMPTY_SNAPSHOT;

export interface DevToolsClientResult {
  apiIds: number[];
  selected: ApiInfo | undefined;
  clearEvents: (apiId: number) => void;
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
  const snapshot = useSyncExternalStore(
    client.subscribe,
    client.getSnapshot,
    client.getServerSnapshot ?? getEmptySnapshot,
  );

  const selected =
    selectedApiId !== null ? snapshot.byId.get(selectedApiId) : undefined;

  const clearEvents = useCallback(
    (apiId: number) => client.clearEvents(apiId),
    [client],
  );

  return { apiIds: snapshot.apiIds, selected, clearEvents };
};
