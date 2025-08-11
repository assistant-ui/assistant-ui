import { Store } from "../tap-store";

// TODO filter the subscription events to only when the mapped state changes
export function mapStore<TState, TResult>(
  store: Store<TState>,
  map: (state: TState) => TResult
): Store<TResult, undefined> {
  return {
    getState: () => map(store.getState()),
    subscribe: store.subscribe,
    actions: undefined,
  };
}
