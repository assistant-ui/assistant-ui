import {
  tapMemo,
  tapEffect,
  ResourceElement,
  resource,
  createResource,
  Unsubscribe,
} from "@assistant-ui/tap";

export interface Store<TState, TActions = unknown, TMeta = unknown> {
  getState(): TState;
  getInitialState(): TState;
  subscribe(listener: () => void): Unsubscribe;

  /**
   * Synchronously flush all the updates to the store.
   *
   * @deprecated This method is still experimental and may be removed in the future.
   */
  flushSync(): void;

  readonly actions: TActions;
  readonly meta: TMeta;
}

type StoreResult<TState, TActions, TMeta> = {
  state: TState;
  actions: TActions;
  meta: TMeta;
};

export const asStore = resource(
  <TState, TActions, TMeta, TProps>(
    element: ResourceElement<StoreResult<TState, TActions, TMeta>, TProps>,
  ): Store<TState, TActions, TMeta> => {
    const resource = tapMemo(
      () => createResource(element, true),
      [element.type],
    );

    tapEffect(() => {
      resource.updateInput(element.props);
    });

    return tapMemo<Store<TState, TActions, TMeta>>(() => {
      const initialState = resource.getState().state;
      return {
        getState: () => resource.getState().state,
        getInitialState: () => initialState,
        subscribe: resource.subscribe,
        flushSync: resource.flushSync,
        actions: resource.getState().actions,
        meta: resource.getState().meta,
      };
    }, [resource]);
  },
);
