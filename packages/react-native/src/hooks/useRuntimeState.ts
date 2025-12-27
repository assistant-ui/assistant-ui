import { useSyncExternalStore, useDebugValue } from "react";
import type { Unsubscribe } from "@assistant-ui/core";

export type SubscribableRuntime<TState> = {
  getState: () => TState;
  subscribe: (callback: () => void) => Unsubscribe;
};

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
  selector?: ((state: TState) => TSelected) | undefined,
): TSelected | TState {
  const select =
    selector ?? (identity as (state: TState) => TSelected | TState);

  const slice = useSyncExternalStore(
    runtime.subscribe,
    () => select(runtime.getState()),
    () => select(runtime.getState()),
  );

  useDebugValue(slice);
  return slice;
}

export function useRuntimeStateOptional<TState>(
  runtime: SubscribableRuntime<TState> | null,
): TState | null;
export function useRuntimeStateOptional<TState, TSelected>(
  runtime: SubscribableRuntime<TState> | null,
  selector: (state: TState) => TSelected,
): TSelected | null;
export function useRuntimeStateOptional<TState, TSelected>(
  runtime: SubscribableRuntime<TState> | null,
  selector?: ((state: TState) => TSelected) | undefined,
): TSelected | TState | null {
  const select =
    selector ?? (identity as (state: TState) => TSelected | TState);

  const noopSubscribe = () => () => {};
  const noopGetSnapshot = () => null;

  const slice = useSyncExternalStore(
    runtime?.subscribe ?? noopSubscribe,
    runtime ? () => select(runtime.getState()) : noopGetSnapshot,
    runtime ? () => select(runtime.getState()) : noopGetSnapshot,
  );

  useDebugValue(slice);
  return slice;
}
