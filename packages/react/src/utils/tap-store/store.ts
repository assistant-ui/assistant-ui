import {
  tapMemo,
  tapEffect,
  ResourceElement,
  resource,
  createResource,
} from "@assistant-ui/tap";

export type Unsubscribe = () => void;

export interface Store<TState, TActions = unknown> {
  getState(): TState;
  subscribe(listener: () => void): Unsubscribe;
  actions: TActions;
}

type StoreResult<TState, TActions> = {
  state: TState;
  actions: TActions;
};

export const asStore = resource(
  <TState, TActions, TProps>(
    element: ResourceElement<StoreResult<TState, TActions>, TProps>,
  ): Store<TState, TActions> => {
    const resource = tapMemo(() => createResource(element), [element.type]);
    tapEffect(() => {
      resource.updateInput(element.props);
    });

    return tapMemo<Store<TState, TActions>>(() => {
      return {
        getState: () => resource.getState().state,
        subscribe: resource.subscribe,
        actions: resource.getState().actions,
      };
    }, [resource]);
  },
);
