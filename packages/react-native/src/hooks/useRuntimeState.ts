import { useCallback, useRef, useSyncExternalStore } from "react";
import type { Unsubscribe } from "@assistant-ui/core";

type Subscribable<TState> = {
  getState(): TState;
  subscribe(callback: () => void): Unsubscribe;
};

function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (
    typeof a !== "object" ||
    typeof b !== "object" ||
    a === null ||
    b === null
  )
    return false;

  const keysA = Object.keys(a as Record<string, unknown>);
  const keysB = Object.keys(b as Record<string, unknown>);
  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (
      !Object.is(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key],
      )
    )
      return false;
  }
  return true;
}

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

  const cachedRef = useRef<TSelected | undefined>(undefined);

  const getSnapshot = useCallback((): TSelected => {
    const state = runtime.getState();
    const next = selectorRef.current
      ? selectorRef.current(state)
      : (state as unknown as TSelected);

    // Return cached snapshot if shallowly equal to satisfy useSyncExternalStore's
    // referential equality requirement. Core runtimes may return new objects on
    // each getState() call when no subscriber is connected yet.
    if (
      cachedRef.current !== undefined &&
      shallowEqual(cachedRef.current, next)
    ) {
      return cachedRef.current;
    }

    cachedRef.current = next;
    return next;
  }, [runtime]);

  return useSyncExternalStore(runtime.subscribe, getSnapshot, getSnapshot);
}
