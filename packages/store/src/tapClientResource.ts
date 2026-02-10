import {
  tapEffect,
  tapMemo,
  tapRef,
  type ResourceElement,
  tapResource,
} from "@assistant-ui/tap";
import type { ClientMethods } from "./types/client";
import {
  tapClientStack,
  tapWithClientStack,
  SYMBOL_CLIENT_INDEX,
} from "./utils/tap-client-stack-context";
import {
  BaseProxyHandler,
  handleIntrospectionProp,
} from "./utils/BaseProxyHandler";
import { wrapperResource } from "./wrapperResource";

/**
 * Symbol used internally to get state from ClientProxy.
 * This allows getState() to be optional in the user-facing client.
 */
const SYMBOL_GET_OUTPUT = Symbol("assistant-ui.store.getValue");

type ClientInternal = {
  [SYMBOL_GET_OUTPUT]: ClientMethods;
};

export const getClientState = (client: ClientMethods) => {
  const output = (client as unknown as ClientInternal)[SYMBOL_GET_OUTPUT];
  if (!output) {
    throw new Error(
      "Client scope contains a non-client resource. " +
        "Ensure your Derived get() returns a client created with tapClientResource(), not a plain resource.",
    );
  }
  return (output as any).getState?.();
};

// Global cache for function templates by field name
const fieldAccessFns = new Map<
  string | symbol,
  (this: unknown, ...args: unknown[]) => unknown
>();

function getOrCreateProxyFn(prop: string | symbol) {
  let template = fieldAccessFns.get(prop);
  if (!template) {
    template = function (this: unknown, ...args: unknown[]) {
      if (!this || typeof this !== "object") {
        throw new Error(
          `Method "${String(prop)}" called without proper context. ` +
            `This may indicate the function was called incorrectly.`,
        );
      }

      const output = (this as ClientInternal)[SYMBOL_GET_OUTPUT];
      if (!output) {
        throw new Error(
          `Method "${String(prop)}" called on invalid client proxy. ` +
            `Ensure you are calling this method on a valid client instance.`,
        );
      }

      const method = output[prop];
      if (!method)
        throw new Error(`Method "${String(prop)}" is not implemented.`);
      if (typeof method !== "function")
        throw new Error(`"${String(prop)}" is not a function.`);
      return method(...args);
    };
    fieldAccessFns.set(prop, template);
  }
  return template;
}

class ClientProxyHandler
  extends BaseProxyHandler
  implements ProxyHandler<object>
{
  private boundFns: Map<string | symbol, Function> | undefined;
  private cachedReceiver: unknown;

  constructor(
    private readonly outputRef: {
      current: ClientMethods;
    },
    private readonly index: number,
  ) {
    super();
  }

  get(_: unknown, prop: string | symbol, receiver: unknown) {
    if (prop === SYMBOL_GET_OUTPUT) return this.outputRef.current;
    if (prop === SYMBOL_CLIENT_INDEX) return this.index;
    const introspection = handleIntrospectionProp(prop, "ClientProxy");
    if (introspection !== false) return introspection;
    const value = this.outputRef.current[prop];
    if (typeof value === "function") {
      if (this.cachedReceiver !== receiver) {
        this.boundFns = new Map();
        this.cachedReceiver = receiver;
      }
      let bound = this.boundFns!.get(prop);
      if (!bound) {
        bound = getOrCreateProxyFn(prop).bind(receiver);
        this.boundFns!.set(prop, bound);
      }
      return bound;
    }
    return value;
  }

  ownKeys(): ArrayLike<string | symbol> {
    return Object.keys(this.outputRef.current);
  }

  has(_: unknown, prop: string | symbol) {
    if (prop === SYMBOL_GET_OUTPUT) return true;
    if (prop === SYMBOL_CLIENT_INDEX) return true;
    return prop in this.outputRef.current;
  }
}

/**
 * Resource that wraps a plain resource element to create a stable client proxy.
 *
 * Takes a ResourceElement that returns methods (with optional getState()) and
 * wraps it to produce a stable client proxy. This adds the client to the
 * client stack, enabling event scoping.
 *
 * @internal
 */
export const ClientResource = wrapperResource(
  <TMethods extends ClientMethods>(
    element: ResourceElement<TMethods>,
  ): {
    methods: TMethods;
    state: unknown;
    key: string | number | undefined;
  } => {
    const valueRef = tapRef(null as unknown as TMethods);

    const index = tapClientStack().length;
    const methods = tapMemo(
      () =>
        new Proxy<TMethods>(
          {} as TMethods,
          new ClientProxyHandler(valueRef, index),
        ),
      [index],
    );

    const value = tapWithClientStack(methods, () => tapResource(element));
    if (!valueRef.current) {
      valueRef.current = value;
    }

    tapEffect(() => {
      valueRef.current = value;
    });

    const state = (value as any).getState?.();
    return { methods, state, key: element.key };
  },
);

type InferClientState<TMethods> = TMethods extends {
  getState: () => infer S;
}
  ? S
  : undefined;

export const tapClientResource = <TMethods extends ClientMethods>(
  element: ResourceElement<TMethods>,
): {
  state: InferClientState<TMethods>;
  methods: TMethods;
  key: string | number | undefined;
} => {
  return tapResource(ClientResource(element)) as {
    state: InferClientState<TMethods>;
    methods: TMethods;
    key: string | number | undefined;
  };
};
