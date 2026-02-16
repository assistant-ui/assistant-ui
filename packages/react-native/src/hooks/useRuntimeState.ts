import { useCallback, useRef, useSyncExternalStore } from "react";
import type { Unsubscribe } from "@assistant-ui/core";

type Subscribable<TState> = {
  getState(): TState;
  subscribe(callback: () => void): Unsubscribe;
};

export function useRuntimeState<TState>(runtime: Subscribable<TState>): TState;
export function useRuntimeState<TState, TSelected>(
  runtime: Subscribable<TState>,
  selector: (state: TState) => TSelected,
): TSelected;
export function useRuntimeState<TState, TSelected = TState>(
  runtime: Subscribable<TState>,
  selector?: (state: TState) => TSelected,
): TSelected {
  const selectorRef = useRef(selector);
  selectorRef.current = selector;

  const getSnapshot = useCallback(() => {
    const state = runtime.getState();
    if (selectorRef.current) {
      return selectorRef.current(state);
    }
    return state as unknown as TSelected;
  }, [runtime]);

  return useSyncExternalStore(runtime.subscribe, getSnapshot, getSnapshot);
}
