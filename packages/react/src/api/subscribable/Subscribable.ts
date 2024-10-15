import { Unsubscribe } from "../../types";

export type Subscribable = {
  subscribe: (callback: () => void) => Unsubscribe;
};

export type SubscribableWithState<TState, TPath> = Subscribable & {
  path: TPath;
  getState: () => TState;
};

export type NestedSubscribable<
  TState extends Subscribable | undefined,
  TPath,
> = SubscribableWithState<TState, TPath>;
