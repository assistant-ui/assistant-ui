import { useCallback } from "react";
import { useSyncExternalStore } from "react";
import { useA2uiContext } from "../react/A2uiContext";
import type { A2uiSurface } from "../types";

export function useA2uiSurface(surfaceId: string): A2uiSurface | undefined {
  const { surfaceManager } = useA2uiContext();
  return useSyncExternalStore(
    surfaceManager.subscribe,
    useCallback(
      () => surfaceManager.getSurface(surfaceId),
      [surfaceManager, surfaceId],
    ),
  );
}
