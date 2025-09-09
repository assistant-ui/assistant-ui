import {
  tapMemo,
  tapEffect,
  ResourceElement,
  resource,
  createResource,
  Unsubscribe,
} from "@assistant-ui/tap";

export interface Store<TState> {
  /**
   * Get the current state of the store.
   */
  getState(): TState;

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
  <TState, TProps>(element: ResourceElement<TState, TProps>): Store<TState> => {
    const resource = tapMemo(
      () => createResource(element, true),
      [element.type],
    );

    tapEffect(() => {
      resource.updateInput(element.props);
    });

    return resource;
  },
);
