import { createContext, useContext } from "react";
import type { ThreadMessageKey } from "./useThreadViewportState";
import type {
  ThreadViewportDerivedState,
  ThreadViewportState,
  ThreadViewportStateActions,
} from "./useThreadViewportState";

export type ThreadViewportStateSnapshot = Pick<
  ThreadViewportState,
  "scrollOffset" | "autoScroll" | "viewportHeight" | "stickToBottomThreshold"
> &
  ThreadViewportDerivedState & {
    messageKeys: ThreadMessageKey[];
  };

export type ThreadViewportContextValue = {
  state: ThreadViewportStateSnapshot;
  actions: ThreadViewportStateActions;
  viewportWidth: number;
  setViewportHeight: (height: number) => void;
  setViewportWidth: (width: number) => void;
  setMessageKeys: (keys: readonly ThreadMessageKey[]) => void;
  setMessageHeight: (key: ThreadMessageKey, height: number) => void;
};

export const ThreadViewportContext =
  createContext<ThreadViewportContextValue | null>(null);

export const useOptionalThreadViewport = () =>
  useContext(ThreadViewportContext);

export const useThreadViewport = () => {
  const context = useOptionalThreadViewport();
  if (!context) {
    throw new Error(
      "Thread viewport components must be used inside ThreadPrimitive.ViewportProvider or ThreadPrimitive.Viewport.",
    );
  }
  return context;
};
