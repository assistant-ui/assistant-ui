import { useSyncExternalStore, useCallback } from "react";
import { useThreadListContext } from "../context/ThreadListContext";
import type { ThreadListState } from "../runtime/types";

export function useThreadList(): ThreadListState;
export function useThreadList<TSelected>(
  selector: (state: ThreadListState) => TSelected,
): TSelected;
export function useThreadList<TSelected>(
  selector?: (state: ThreadListState) => TSelected,
): ThreadListState | TSelected {
  const runtime = useThreadListContext();

  const subscribe = useCallback(
    (callback: () => void) => runtime.subscribe(callback),
    [runtime],
  );

  const getSnapshot = useCallback(() => {
    const state = runtime.getState();
    return selector ? selector(state) : state;
  }, [runtime, selector]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
