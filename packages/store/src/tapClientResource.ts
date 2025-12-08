import {
  tapEffect,
  tapMemo,
  tapRef,
  type ResourceElement,
  tapResource,
  resource,
  tapResources,
} from "@assistant-ui/tap";
import type { ClientObject, ScopeOutputOf } from "./types";

/**
 * Symbol used internally to get state from ClientProxy.
 * This allows getState() to be optional in the user-facing client.
 */
const SYMBOL_GET_OUTPUT = Symbol("assistant-ui.store.getValue");

export const getClientState = <TState>(client: ClientObject): TState => {
  return (
    client as unknown as {
      [SYMBOL_GET_OUTPUT]: () => ScopeOutputOf<TState, ClientObject>;
    }
  )[SYMBOL_GET_OUTPUT]!().state;
};

// Global cache for function templates by field name
const fieldAccessFns = new Map<
  string | symbol,
  (
    this: { [SYMBOL_GET_OUTPUT]: () => ScopeOutputOf<unknown, ClientObject> },
    ...args: unknown[]
  ) => unknown
>();

function getOrCreateProxyFn(prop: string) {
  let template = fieldAccessFns.get(prop);
  if (!template) {
    template = function (
      this: { [SYMBOL_GET_OUTPUT]: () => ScopeOutputOf<unknown, ClientObject> },
      ...args: unknown[]
    ) {
      const method = this[SYMBOL_GET_OUTPUT]().client[prop];
      if (!method) throw new Error(`Method ${prop} not found`);
      return method(...args);
    };
    fieldAccessFns.set(prop, template);
  }
  return template;
}

class ClientProxy<TClient extends ClientObject>
  implements ProxyHandler<TClient>
{
  constructor(
    private readonly getOutput: () => ScopeOutputOf<unknown, TClient>,
  ) {}

  get(_: unknown, prop: string | symbol) {
    if (prop === SYMBOL_GET_OUTPUT) return this.getOutput;
    if (typeof prop !== "string") return undefined;
    return getOrCreateProxyFn(prop);
  }

  ownKeys(): ArrayLike<string | symbol> {
    return Object.keys(this.getOutput().client);
  }

  has(_: unknown, prop: string | symbol) {
    if (prop === SYMBOL_GET_OUTPUT) return true;
    return prop in this.getOutput().client;
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
 * Wraps a plain resource element to create a stable client proxy.
 *
 * Takes a ResourceElement that returns { state, client } and
 * wraps it to produce a stable client proxy.
 */
export const tapClientResource = <TState, TClient extends ClientObject>(
  element: ResourceElement<ScopeOutputOf<TState, TClient>>,
) => {
  const valueRef = tapRef<ScopeOutputOf<TState, TClient>>();

  const client = tapMemo(
    () =>
      new Proxy<TClient>(
        {} as TClient,
        new ClientProxy<TClient>(() => valueRef.current!),
      ),
    [],
  );

  const value = tapResource(element);
  if (!valueRef.current) {
    valueRef.current = value;
  }

  tapEffect(() => {
    valueRef.current = value;
  });

  return tapMemo(() => ({ client }), [value.state]);
};

const ClientResource = resource(
  <TState, TClient extends ClientObject>(
    element: ResourceElement<ScopeOutputOf<TState, TClient>>,
  ): { client: TClient } => {
    return tapClientResource(element);
  },
);

export const tapClientResources = <
  TState,
  TClient extends ClientObject,
  M extends Record<string | number | symbol, any>,
>(
  map: M,
  getElement: (
    t: M[keyof M],
    key: keyof M,
  ) => ResourceElement<ScopeOutputOf<TState, TClient>>,
  getElementDeps?: any[],
): { [K in keyof M]: { client: TClient } } => {
  return tapResources(
    map,
    (t, key) => ClientResource(getElement(t, key)),
    getElementDeps,
  );
};
