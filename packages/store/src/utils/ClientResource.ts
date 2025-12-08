import {
  tapEffect,
  tapMemo,
  tapRef,
  type ResourceElement,
  tapResource,
  resource,
} from "@assistant-ui/tap";
import type { ClientMethods, ClientResourceOutputOf } from "../types/client";
import {
  tapClientStack,
  tapWithClientStack,
  SYMBOL_CLIENT_INDEX,
} from "./tap-client-stack-context";

/**
 * Symbol used internally to get state from ClientProxy.
 * This allows getState() to be optional in the user-facing client.
 */
const SYMBOL_GET_OUTPUT = Symbol("assistant-ui.store.getValue");

export const getClientState = <TState>(client: ClientMethods): TState => {
  return (
    client as unknown as {
      [SYMBOL_GET_OUTPUT]: () => ClientResourceOutputOf<TState, ClientMethods>;
    }
  )[SYMBOL_GET_OUTPUT]!().state;
};

// Global cache for function templates by field name
const fieldAccessFns = new Map<
  string | symbol,
  (
    this: {
      [SYMBOL_GET_OUTPUT]: () => ClientResourceOutputOf<unknown, ClientMethods>;
    },
    ...args: unknown[]
  ) => unknown
>();

function getOrCreateProxyFn(prop: string) {
  let template = fieldAccessFns.get(prop);
  if (!template) {
    template = function (
      this: {
        [SYMBOL_GET_OUTPUT]: () => ClientResourceOutputOf<
          unknown,
          ClientMethods
        >;
      },
      ...args: unknown[]
    ) {
      const method = this[SYMBOL_GET_OUTPUT]().methods[prop];
      if (!method) throw new Error(`Method ${prop} not found`);
      return method(...args);
    };
    fieldAccessFns.set(prop, template);
  }
  return template;
}

class ClientProxy<TMethods extends ClientMethods>
  implements ProxyHandler<TMethods>
{
  constructor(
    private readonly getOutput: () => ClientResourceOutputOf<unknown, TMethods>,
    private readonly index: number,
  ) {}

  get(_: unknown, prop: string | symbol) {
    if (prop === SYMBOL_GET_OUTPUT) return this.getOutput;
    if (prop === SYMBOL_CLIENT_INDEX) return this.index;
    if (typeof prop !== "string") return undefined;
    return getOrCreateProxyFn(prop);
  }

  ownKeys(): ArrayLike<string | symbol> {
    return Object.keys(this.getOutput().methods);
  }

  has(_: unknown, prop: string | symbol) {
    if (prop === SYMBOL_GET_OUTPUT) return true;
    if (prop === SYMBOL_CLIENT_INDEX) return true;
    return prop in this.getOutput().methods;
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
 * Resource that wraps a plain resource element to create a stable client proxy.
 *
 * Takes a ResourceElement that returns { state, methods } and
 * wraps it to produce a stable client proxy.
 */
export const ClientResource = resource(
  <TState, TMethods extends ClientMethods>(
    element: ResourceElement<ClientResourceOutputOf<TState, TMethods>>,
  ): { methods: TMethods } => {
    const valueRef = tapRef<ClientResourceOutputOf<TState, TMethods>>();

    const index = tapClientStack().length;
    const methods = tapMemo(
      () =>
        new Proxy<TMethods>(
          {} as TMethods,
          new ClientProxy<TMethods>(() => valueRef.current!, index),
        ),
      [],
    );

    const value = tapWithClientStack(methods, () => tapResource(element));
    if (!valueRef.current) {
      valueRef.current = value;
    }

    tapEffect(() => {
      valueRef.current = value;
    });

    return tapMemo(() => ({ methods }), [value.state]);
  },
);
