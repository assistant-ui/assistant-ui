import {
  tapMemo,
  tapEffect,
  ResourceElement,
  resource,
  createResource,
} from "@assistant-ui/tap";
import { Unsubscribe } from "../../types";

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

export const asStore = resource(
  <TState, TProps>(element: ResourceElement<TState, TProps>): Store<TState> => {
    // biome-ignore lint/correctness/useExhaustiveDependencies: we only depend on the element type
    const resource = tapMemo(
      () => createResource(element, { mount: false }),
      [element.type],
    );

    tapEffect(() => {
      resource.render(element);
    });

    return resource;
  },
);
