import { useMemo, useCallback, useRef, type ReactNode } from "react";
import { A2uiContext, type A2uiContextValue } from "./A2uiContext";
import { SurfaceManager } from "../surface/SurfaceManager";
import { SurfaceDataStore } from "../surface/SurfaceDataStore";
import type {
  A2uiComponentRenderer,
  A2uiAction,
  A2uiServerMessage,
} from "../types";

export type A2uiProviderProps = {
  children: ReactNode;
  components: Record<string, A2uiComponentRenderer>;
  onAction?: (action: A2uiAction) => void;
};

export const A2uiProvider = ({
  children,
  components: userComponents,
  onAction,
}: A2uiProviderProps) => {
  const surfaceManagerRef = useRef<SurfaceManager | null>(null);
  if (!surfaceManagerRef.current) {
    surfaceManagerRef.current = new SurfaceManager();
  }
  const surfaceManager = surfaceManagerRef.current;

  const dataStoreRef = useRef<SurfaceDataStore | null>(null);
  if (!dataStoreRef.current) {
    dataStoreRef.current = new SurfaceDataStore();
  }
  const dataStore = dataStoreRef.current;

  const handleAction = useCallback(
    (action: A2uiAction) => {
      onAction?.(action);
    },
    [onAction],
  );

  const processMessage = useCallback(
    (msg: A2uiServerMessage) => {
      switch (msg.type) {
        case "createSurface":
          surfaceManager.createSurface(msg);
          break;
        case "updateComponents":
          surfaceManager.updateComponents(msg);
          break;
        case "updateDataModel":
          dataStore.setData(msg.surfaceId, msg.path, msg.value);
          break;
        case "deleteSurface":
          surfaceManager.deleteSurface(msg);
          dataStore.deleteSurface(msg.surfaceId);
          break;
      }
    },
    [surfaceManager, dataStore],
  );

  const ctxValue = useMemo<A2uiContextValue>(
    () => ({
      surfaceManager,
      dataStore,
      components: userComponents,
      onAction: handleAction,
      processMessage,
    }),
    [surfaceManager, dataStore, userComponents, handleAction, processMessage],
  );

  return (
    <A2uiContext.Provider value={ctxValue}>{children}</A2uiContext.Provider>
  );
};
