import { useDebugValue, useSyncExternalStore } from "react";
import { Store } from "../tap-store";

const identity = <T>(arg: T): T => arg;

export function useStoreWithSelector<TState, TSelected>(
  context: Store<TState>,
  selector: ((state: TState) => TSelected | TState) | undefined = identity
): TSelected | TState {
  const slice = useSyncExternalStore(
    context.subscribe,
    () => selector(context.getState()),
    () => selector(context.getState())
  );
  useDebugValue(slice);
  return slice;
}
