"use client";

import { useLayoutEffect } from "react";
import { useThreadViewportStore } from "../../../context/react/ThreadViewportContext";
import { mountTopAnchorReserve } from "./mountTopAnchorReserve";

/**
 * Mounts the top-turn-anchor reserve element against the active
 * `ThreadViewport` store. Call this from inside the scrollable viewport so
 * the reserve `<div>` is appended next to the streaming assistant message.
 */
export const useTopAnchorReserve = (enabled: boolean) => {
  const threadViewportStore = useThreadViewportStore();

  useLayoutEffect(() => {
    if (!enabled) return;
    return mountTopAnchorReserve(threadViewportStore);
  }, [enabled, threadViewportStore]);
};
