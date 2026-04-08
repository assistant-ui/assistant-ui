import { useSyncExternalStore } from "react";
import { useA2uiContext } from "../react/A2uiContext";
import type { A2uiSurface } from "../types";

export function useA2uiSurfaces(): A2uiSurface[] {
  const { surfaceManager } = useA2uiContext();
  return useSyncExternalStore(
    surfaceManager.subscribe,
    surfaceManager.getSurfaces,
  );
}
