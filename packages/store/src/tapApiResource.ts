import {
  tapEffect,
  tapMemo,
  tapRef,
  type ResourceElement,
  tapResource,
  resource,
  tapResources,
} from "@assistant-ui/tap";
import type { ApiObject, ScopeOutputOf } from "./types";

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
 * Readonly API handler for creating stable proxies
 */
class ReadonlyApiHandler<TState, TApi extends ApiObject>
  implements ProxyHandler<ScopeOutputOf<TState, TApi>>
{
  private getState = () => this.getValue().state;
  constructor(private readonly getValue: () => ScopeOutputOf<TState, TApi>) {}

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

/**
 * Wraps a plain resource element to create a stable API proxy.
 *
 * Takes a ResourceElement that returns { state, api, key? } and
 * wraps it to produce { key, state, api } where api is a stable proxy.
 */
export const tapApiResource = <TState, TApi extends ApiObject>(
  element: ResourceElement<ScopeOutputOf<TState, TApi>>,
): ScopeOutputOf<TState, TApi> => {
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
    element: ResourceElement<ScopeOutputOf<TState, TApi>>,
  ): ScopeOutputOf<TState, TApi> => {
    return tapApiResource(element);
  },
);

export const tapApiResources = <
  TState,
  TApi extends ApiObject,
  M extends Record<string | number | symbol, any>,
>(
  map: M,
  getElement: (
    t: M[keyof M],
    key: keyof M,
  ) => ResourceElement<ScopeOutputOf<TState, TApi>>,
  getElementDeps?: any[],
): { [K in keyof M]: ScopeOutputOf<TState, TApi> } => {
  return tapResources(
    map,
    (t, key) => ApiResource(getElement(t, key)),
    getElementDeps,
  );
};
