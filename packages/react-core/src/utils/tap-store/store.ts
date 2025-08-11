import {
  tapMemo,
  tapEffect,
  ResourceElement,
  ResourceFn,
  ResourceElementConstructor,
  resource,
  tapState,
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

function tapStore<TState, TActions, TProps>(
  element: ResourceElement<StoreResult<TState, TActions>, TProps>,
): Store<TState, TActions> {
  const [resource] = tapState(() => createResource(element));
  tapEffect(() => {
    resource.updateInput(element.props);
  });

  return tapMemo<Store<TState, TActions>>(() => {
    return {
      getState: () => resource.getState().state,
      subscribe: (callback) => {
        return resource.subscribe(callback);
      },
      actions: resource.getState().actions,
    };
  }, []);
}

export const store = <TState, TAPI, TProps>(
  fn: ResourceFn<StoreResult<TState, TAPI>, TProps>,
) => {
  const ctor = resource(fn);
  return resource((props: TProps) => {
    return tapStore(ctor(props));
  });
};

/**
 * Higher-order function that transforms a ResourceElementConstructor into a store-type ResourceElementConstructor.
 * Similar to HOCs (Higher-Order Components), this wraps any resource to provide store functionality.
 * 
 * @param ctor - A ResourceElementConstructor that returns { state, actions }
 * @returns A ResourceElementConstructor that returns a Store interface with getState(), subscribe(), and actions
 */
export const asStore = <TState, TActions, TProps>(
  ctor: ResourceElementConstructor<StoreResult<TState, TActions>, TProps>,
): ResourceElementConstructor<Store<TState, TActions>, TProps> => {
  return resource((props: TProps) => {
    return tapStore(ctor(props));
  });
};
