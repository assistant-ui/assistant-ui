import { useCallback, useSyncExternalStore } from "react";
import { useA2uiContext } from "../react/A2uiContext";

const getServerSnapshot = (): unknown => undefined;

export function useA2uiData(surfaceId: string, path: string): unknown {
  const { dataStore } = useA2uiContext();
  return useSyncExternalStore(
    useCallback(
      (cb) => dataStore.subscribe(surfaceId, path, cb),
      [dataStore, surfaceId, path],
    ),
    useCallback(
      () => dataStore.getData(surfaceId, path),
      [dataStore, surfaceId, path],
    ),
    getServerSnapshot,
  );
}
