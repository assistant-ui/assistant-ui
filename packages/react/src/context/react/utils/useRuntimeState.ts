import { useDebugValue, useSyncExternalStore, useRef, useCallback } from "react";
import { Unsubscribe } from "../../../types";
import { ensureBinding } from "./ensureBinding";

export type SubscribableRuntime<TState> = {
  getState: () => TState;
  subscribe: (callback: () => void) => Unsubscribe;
};

function shallowEqual(objA: any, objB: any): boolean {
  if (objA === objB) return true;
  if (
    typeof objA !== "object" ||
    objA === null ||
    typeof objB !== "object" ||
    objB === null
  ) {
    return false;
  }
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (objA[key] !== objB[key]) return false;
  }
  return true;
}

export function useRuntimeStateInternal<TState, TSelected>(
  runtime: SubscribableRuntime<TState>,
  selector: ((state: TState) => TSelected | TState) | undefined = identity,
): TSelected | TState {
  // TODO move to useRuntimeState
  ensureBinding(runtime);

  const lastSnapshot = useRef<TSelected | TState>(undefined);

  const getSnapshot = useCallback(() => {
    const newSnapshot = selector(runtime.getState());
    if (
      lastSnapshot.current !== undefined &&
      shallowEqual(lastSnapshot.current, newSnapshot)
    ) {
      return lastSnapshot.current;
    }
    lastSnapshot.current = newSnapshot;
    return newSnapshot;
  }, [runtime, selector]);

  const slice = useSyncExternalStore(
    runtime.subscribe,
    getSnapshot,
    getSnapshot
  );

  useDebugValue(slice);
  return slice as TSelected | TState;
}

const identity = <T>(arg: T): T => arg;
export function useRuntimeState<TState>(
  runtime: SubscribableRuntime<TState>,
): TState;
export function useRuntimeState<TState, TSelected>(
  runtime: SubscribableRuntime<TState>,
  selector: (state: TState) => TSelected,
): TSelected;
export function useRuntimeState<TState, TSelected>(
  runtime: SubscribableRuntime<TState>,
  selector: ((state: TState) => TSelected) | undefined,
): TSelected | TState;
export function useRuntimeState<TState, TSelected>(
  runtime: SubscribableRuntime<TState>,
  selector?: ((state: TState) => TSelected) | undefined,
): TSelected | TState {
  // ensure that the runtime is bound
  // ensureBinding(runtime);

  return useRuntimeStateInternal(runtime, selector);
}
