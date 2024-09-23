import { Unsubscribe } from "../../types";

export type Subscribable = {
  subscribe: (callback: () => void) => Unsubscribe;
};

export type SubscribableWithState<TState> = Subscribable & {
  getState: () => TState;
};

export type NestedSubscribable<TState extends Subscribable> =
  SubscribableWithState<TState>;
