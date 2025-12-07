import {
  tapEffect,
  tapMemo,
  tapRef,
  type ResourceElement,
  tapResource,
  resource,
  tapResources,
} from "@assistant-ui/tap";

/**
 * Symbol used internally to get state from ApiProxy.
 * This allows getState() to be optional in the user-facing API.
 */
const SYMBOL_GET_STATE = Symbol.for("assistant-ui.getState");

/**
 * Get the state from an ApiProxy.
 * Used internally by useAssistantState to access state without requiring getState() in the API.
 */
export const getApiState = <TState>(api: ApiObject): TState => {
  return (api as { [SYMBOL_GET_STATE]: () => TState })[SYMBOL_GET_STATE]!();
};

/**
 * API object type
 */
export interface ApiObject {
  [key: string]: (...args: any[]) => any;
}

/**
 * Readonly API handler for creating stable proxies
 */
class ReadonlyApiHandler<TState, TApi extends ApiObject>
  implements ProxyHandler<ClientValue<TState, TApi>>
{
  private getState = () => this.getValue().state;
  constructor(private readonly getValue: () => ClientValue<TState, TApi>) {}

  get(_: unknown, prop: string | symbol) {
    if (prop === SYMBOL_GET_STATE) return this.getState;
    return this.getValue().api[prop as keyof TApi];
  }

  ownKeys(): ArrayLike<string | symbol> {
    return Object.keys(this.getValue().api);
  }

  has(_: unknown, prop: string | symbol) {
    if (prop === SYMBOL_GET_STATE) return true;
    return prop in this.getValue().api;
  }

  getOwnPropertyDescriptor(_: unknown, prop: string | symbol) {
    const value = this.get(_, prop);
    if (value === undefined) return undefined;
    return {
      value,
      writable: false,
      enumerable: false,
      configurable: false,
    };
  }

  set() {
    return false;
  }
  defineProperty() {
    return false;
  }
  deleteProperty() {
    return false;
  }
}

type ClientValue<TState, TApi extends ApiObject> = {
  state: TState;
  api: TApi;
  key?: string;
};

/**
 * Wraps a plain resource element to create a stable API proxy.
 *
 * Takes a ResourceElement that returns { state, api, key? } and
 * wraps it to produce { key, state, api } where api is a stable proxy.
 */
export const tapApiResource = <TState, TApi extends ApiObject>(
  element: ResourceElement<{ state: TState; api: TApi; key?: string }>,
): {
  key: string | undefined;
  state: TState;
  api: TApi;
} => {
  const value = tapResource(element);

  const valueRef = tapRef(value);
  tapEffect(() => {
    valueRef.current = value;
  });

  // Create stable proxy
  const api = tapMemo(
    () =>
      new Proxy<TApi>(
        undefined as unknown as TApi,
        new ReadonlyApiHandler<TState, TApi>(() => valueRef.current),
      ),
    [element.type],
  );
  const { key, state } = value;
  return tapMemo(() => ({ key, state, api }), [state, key]);
};

const ApiResource = resource(
  <TState, TApi extends ApiObject>(
    element: ResourceElement<{
      state: TState;
      api: TApi;
      key?: string;
    }>,
  ): {
    key: string | undefined;
    state: TState;
    api: TApi;
  } => {
    return tapApiResource(element);
  },
);

export const tapApiResources = <TState, TApi extends ApiObject>(
  elements: ResourceElement<{
    state: TState;
    api: TApi;
    key?: string;
  }>[],
): {
  key: string | undefined;
  state: TState;
  api: TApi;
}[] => {
  return tapResources(elements.map((element) => ApiResource(element)));
};
