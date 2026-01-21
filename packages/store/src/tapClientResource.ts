import {
  tapEffect,
  tapMemo,
  tapRef,
  type ResourceElement,
  tapResource,
  tapInlineResource,
} from "@assistant-ui/tap";
import type { ClientMethods, ClientOutputOf } from "./types/client";
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
  [SYMBOL_GET_OUTPUT]: ClientOutputOf<unknown, ClientMethods>;
};

export const getClientState = (client: ClientMethods) => {
  const output = (client as unknown as ClientInternal)[SYMBOL_GET_OUTPUT];
  if (!output) {
    throw new Error(
      "Client scope contains a non-client resource. " +
        "Ensure your Derived get() returns a client created with tapClientResource(), not a plain resource.",
    );
  }
  return output.state;
};

// Global cache for function templates by field name
const fieldAccessFns = new Map<
  string | symbol,
  (this: ClientInternal, ...args: unknown[]) => unknown
>();

function getOrCreateProxyFn(prop: string | symbol) {
  let template = fieldAccessFns.get(prop);
  if (!template) {
    template = function (this: ClientInternal | undefined, ...args: unknown[]) {
      if (!this)
        throw new Error(
          `Destructuring the client method "${String(prop)}" is not supported.`,
        );

      const method = this[SYMBOL_GET_OUTPUT].methods[prop];
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
  constructor(
    private readonly outputRef: {
      current: ClientOutputOf<unknown, ClientMethods>;
    },
    private readonly index: number,
  ) {
    super();
  }

  get(_: unknown, prop: string | symbol) {
    if (prop === SYMBOL_GET_OUTPUT) return this.outputRef.current;
    if (prop === SYMBOL_CLIENT_INDEX) return this.index;
    const introspection = handleIntrospectionProp(prop, "ClientProxy");
    if (introspection !== false) return introspection;
    const value = this.outputRef.current.methods[prop];
    if (typeof value === "function") return getOrCreateProxyFn(prop);
    return value;
  }

  ownKeys(): ArrayLike<string | symbol> {
    return Object.keys(this.outputRef.current.methods);
  }

  has(_: unknown, prop: string | symbol) {
    if (prop === SYMBOL_GET_OUTPUT) return true;
    if (prop === SYMBOL_CLIENT_INDEX) return true;
    return prop in this.outputRef.current.methods;
  }
}

/**
 * Resource that wraps a plain resource element to create a stable client proxy.
 *
 * Takes a ResourceElement that returns { state, methods } and
 * wraps it to produce a stable client proxy. This adds the client to the
 * client stack, enabling event scoping.
 *
 * Use this for 1:1 client mappings where you want event scoping to work correctly.
 *
 * @example
 * ```typescript
 * const MessageResource = resource(({ messageId }: { messageId: string }) => {
 *   return tapInlineResource(
 *     tapClientResource(InnerMessageResource({ messageId }))
 *   );
 * });
 * ```
 */
export const ClientResource = wrapperResource(
  <TState, TMethods extends ClientMethods>(
    element: ResourceElement<ClientOutputOf<TState, TMethods>>,
  ): ClientOutputOf<TState, TMethods> & {
    key: string | number | undefined;
  } => {
    const valueRef = tapRef(
      null as unknown as ClientOutputOf<TState, TMethods>,
    );

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

    return { methods, state: value.state, key: element.key };
  },
);

export const tapClientResource = <TState, TMethods extends ClientMethods>(
  element: ResourceElement<ClientOutputOf<TState, TMethods>>,
) => {
  return tapInlineResource(ClientResource(element));
};
