import { createContext, useContext } from "react";
import type { SurfaceManager } from "../surface/SurfaceManager";
import type { SurfaceDataStore } from "../surface/SurfaceDataStore";
import type {
  A2uiComponentRenderer,
  A2uiAction,
  A2uiServerMessage,
} from "../types";

export type A2uiContextValue = {
  surfaceManager: SurfaceManager;
  dataStore: SurfaceDataStore;
  components: Record<string, A2uiComponentRenderer>;
  onAction: (action: A2uiAction) => void;
  processMessage: (msg: A2uiServerMessage) => void;
};

export const A2uiContext = createContext<A2uiContextValue | null>(null);

export function useA2uiContext(): A2uiContextValue {
  const ctx = useContext(A2uiContext);
  if (!ctx) {
    throw new Error("useA2ui* hooks must be used inside <A2uiProvider>");
  }
  return ctx;
}
