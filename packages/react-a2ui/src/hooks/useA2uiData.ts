import { useCallback } from "react";
import { useSyncExternalStore } from "react";
import { useA2uiContext } from "../react/A2uiContext";

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
  );
}
