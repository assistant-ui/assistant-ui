"use client";

import { useLayoutEffect } from "react";
import { useThreadViewportStore } from "../../../context/react/ThreadViewportContext";
import { mountTopAnchorReserve } from "./mountTopAnchorReserve";

/**
 * Mounts the top-turn-anchor reserve element against the active
 * `ThreadViewport` store. Call this from inside the scrollable viewport so
 * the reserve `<div>` is appended next to the streaming assistant message.
 */
export const useTopAnchorReserve = () => {
  const threadViewportStore = useThreadViewportStore({ optional: true });

  useLayoutEffect(() => {
    if (!threadViewportStore) return;
    return mountTopAnchorReserve(threadViewportStore);
  }, [threadViewportStore]);
};
