"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { ActiveItem } from "../runtime";
import { useAgent } from "./useAgentState";

export function useActiveItems(): ActiveItem[] {
  const agent = useAgent();

  const subscribe = useCallback(
    (callback: () => void) => {
      return agent.subscribe(callback);
    },
    [agent],
  );

  const getSnapshot = useCallback(() => {
    return agent.getActiveItems();
  }, [agent]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
