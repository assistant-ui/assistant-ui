import {
  tapMemo,
  tapEffect,
  ResourceElement,
  resource,
  createResource,
  Unsubscribe,
} from "@assistant-ui/tap";
import { StoreApi } from "./tap-store-api";

export interface Store<TState, TActions> {
  getApi(): StoreApi<TState, TActions>;

  /**
   * Subscribe to the store.
   */
  subscribe(listener: () => void): Unsubscribe;

  /**
   * Synchronously flush all the updates to the store.
   */
  flushSync(): void;
}

export const asStore = resource(
  <TState, TActions, TProps>(
    element: ResourceElement<
      {
        api: StoreApi<TState, TActions>;
      },
      TProps
    >,
  ): Store<TState, TActions> => {
    const resource = tapMemo(
      () => createResource(element, true),
      [element.type],
    );

    tapEffect(() => {
      resource.updateInput(element.props);
    });

    return tapMemo<Store<TState, TActions>>(() => {
      return {
        getApi: () => resource.getState().api,
        subscribe: resource.subscribe,
        flushSync: resource.flushSync,
      };
    }, [resource]);
  },
);
