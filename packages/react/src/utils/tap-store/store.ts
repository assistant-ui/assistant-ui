import {
  tapMemo,
  tapEffect,
  ResourceElement,
  resource,
  createResource,
  Unsubscribe,
} from "@assistant-ui/tap";

export interface Store<TState, TActions = unknown> {
  getState(): TState;
  getInitialState(): TState;
  subscribe(listener: () => void): Unsubscribe;
  readonly actions: TActions;
}

type StoreResult<TState, TActions> = {
  state: TState;
  actions: TActions;
};

export const asStore = resource(
  <TState, TActions, TProps>(
    element: ResourceElement<StoreResult<TState, TActions>, TProps>,
  ): Store<TState, TActions> => {
    const resource = tapMemo(
      () => createResource(element, true),
      [element.type],
    );

    tapEffect(() => {
      resource.updateInput(element.props);
    });

    return tapMemo<Store<TState, TActions>>(() => {
      const initialState = resource.getState().state;
      return {
        getState: () => resource.getState().state,
        getInitialState: () => initialState,
        subscribe: resource.subscribe,
        actions: resource.getState().actions,
      };
    }, [resource]);
  },
);
