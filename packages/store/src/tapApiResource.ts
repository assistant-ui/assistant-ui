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
const SYMBOL_GET_OUTPUT = Symbol("assistant-ui.store.getValue");

export const getApiState = <TState>(api: ApiObject): TState => {
  return (
    api as unknown as {
      [SYMBOL_GET_OUTPUT]: () => ScopeOutputOf<TState, ApiObject>;
    }
  )[SYMBOL_GET_OUTPUT]!().state;
};

// Global cache for function templates by field name
const fieldAccessFns = new Map<
  string | symbol,
  (
    this: { [SYMBOL_GET_OUTPUT]: () => ScopeOutputOf<unknown, ApiObject> },
    ...args: unknown[]
  ) => unknown
>();

function getOrCreateProxyFn(prop: string) {
  let template = fieldAccessFns.get(prop);
  if (!template) {
    template = function (
      this: { [SYMBOL_GET_OUTPUT]: () => ScopeOutputOf<unknown, ApiObject> },
      ...args: unknown[]
    ) {
      const method = this[SYMBOL_GET_OUTPUT]().api[prop];
      if (!method) throw new Error(`Method ${prop} not found`);
      return method(...args);
    };
    fieldAccessFns.set(prop, template);
  }
  return template;
}

class ReadonlyApiHandler<TState, TApi extends ApiObject>
  implements ProxyHandler<ScopeOutputOf<TState, TApi>>
{
  constructor(private readonly getOutput: () => ScopeOutputOf<TState, TApi>) {}

  get(_: unknown, prop: string | symbol) {
    if (prop === SYMBOL_GET_OUTPUT) return this.getOutput;
    if (typeof prop !== "string") return undefined;
    return getOrCreateProxyFn(prop);
  }

  ownKeys(): ArrayLike<string | symbol> {
    return Object.keys(this.getOutput().api);
  }

  has(_: unknown, prop: string | symbol) {
    if (prop === SYMBOL_GET_OUTPUT) return true;
    return prop in this.getOutput().api;
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

  return tapMemo(() => ({ state: value.state, api }), [value.state]);
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
