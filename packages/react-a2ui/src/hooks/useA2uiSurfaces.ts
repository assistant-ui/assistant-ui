import { useSyncExternalStore } from "react";
import { useA2uiContext } from "../react/A2uiContext";
import type { A2uiSurface } from "../types";

const EMPTY_SURFACES: A2uiSurface[] = [];
const getServerSnapshot = (): A2uiSurface[] => EMPTY_SURFACES;

export function useA2uiSurfaces(): A2uiSurface[] {
  const { surfaceManager } = useA2uiContext();
  return useSyncExternalStore(
    surfaceManager.subscribe,
    surfaceManager.getSurfaces,
    getServerSnapshot,
  );
}
