import { tapEffect, tapMemo, tapRef } from "@assistant-ui/tap";

export interface ActionsObject {
  [key: string]: ((...args: any[]) => any) | ActionsObject;
}

export type StoreApi<TState, TActions> = TActions & {
  getState(): TState;
};

class ReadonlyStoreApiHandler<TState, TActions>
  implements ProxyHandler<StoreApi<TState, TActions>>
{
  constructor(
    private readonly getState: () => TState,
    private readonly getActions: () => TActions,
  ) {}

  get(_: unknown, prop: string | symbol) {
    if (prop === "getState") return this.getState;
    return this.getActions()[prop as keyof TActions];
  }

  ownKeys(): ArrayLike<string | symbol> {
    return ["getState", ...Object.keys(this.getActions() as object)];
  }

  has(_: unknown, prop: string | symbol) {
    if (prop === "getState") return true;
    return prop in (this.getActions() as object);
  }

  getOwnPropertyDescriptor(_: unknown, prop: string | symbol) {
    if (prop === "getState")
      return {
        enumerable: true,
        configurable: false,
        get: this.getState,
      };

    return Object.getOwnPropertyDescriptor(this.getState(), prop);
  }
}

export const tapApi = <TState, TActions extends ActionsObject>(
  state: TState,
  actions: TActions,
) => {
  const ref = tapRef(() => ({ state, actions }));
  tapEffect(() => {
    ref.current = { state, actions };
  });

  return tapMemo(
    () =>
      new Proxy<StoreApi<TState, TActions>>(
        {} as StoreApi<TState, TActions>,
        new ReadonlyStoreApiHandler(
          () => ref.current.state,
          () => ref.current.actions,
        ),
      ),
    [],
  );
};
