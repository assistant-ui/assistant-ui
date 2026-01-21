import {
  tapEffect,
  ResourceElement,
  resource,
  createResource,
  tapState,
} from "@assistant-ui/tap";
import { Unsubscribe } from "../types/client";

export interface Store<TState> {
  /**
   * Get the current state of the store.
   */
  getValue(): TState;

  /**
   * Subscribe to the store.
   */
  subscribe(listener: () => void): Unsubscribe;
}

export const StoreResource = resource(
  <TState>(element: ResourceElement<TState>): Store<TState> => {
    const [handle] = tapState(() => createResource(element, { mount: false }));

    tapEffect(() => handle.unmount, [handle]);

    tapEffect(() => {
      handle.render(element);
    });

    return handle;
  },
);
