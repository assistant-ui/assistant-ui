import { useEffect, useMemo, useRef } from "react";
import { resource, useResource, type ResourceElement } from "@assistant-ui/tap";
import type { ClientMethods, InferClientState } from "./types/client";
import {
  useClientStack,
  useClientStackProvider,
  SYMBOL_CLIENT_INDEX,
} from "./utils/tap-client-stack-context";
import {
  BaseProxyHandler,
  handleIntrospectionProp,
} from "./utils/BaseProxyHandler";
import { INSTANCE_TAG_SYMBOL } from "./utils/client-accessor";

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
        "Ensure your Derived get() returns a client created with useClientResource(), not a plain resource.",
    );
  }
  return (output as any).getState?.();
};

type ClientConnection = {
  connected: boolean;
  generation: number;
  warnedMethods: Set<string | symbol> | undefined;
};

const disconnectedMethods = new Set<string | symbol>([
  "getState",
  "subscribe",
  "composer",
  "message",
  "part",
  "attachment",
  "item",
  "queueItem",
  "thread",
  "suggestions",
  "suggestion",
  "task",
  "child",
  "server",
  "connector",
  "customServer",
]);

const fieldAccessFns = new Map<
  string | symbol,
  (
    connection: ClientConnection,
    outputRef: { current: ClientMethods },
    ...args: unknown[]
  ) => unknown
>();

function getOrCreateProxyFn(prop: string | symbol) {
  let template = fieldAccessFns.get(prop);
  if (!template) {
    template = function (connection, outputRef, ...args) {
      if (!connection.connected && !disconnectedMethods.has(prop)) {
        const warnedMethods = (connection.warnedMethods ??= new Set());
        if (!warnedMethods.has(prop)) {
          warnedMethods.add(prop);
          console.warn(
            `Method "${String(prop)}" called on a disconnected client. The action was ignored.`,
          );
        }
        return undefined;
      }

      const method = outputRef.current[prop];
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
  private boundFns:
    | Map<string | symbol, (...args: never) => unknown>
    | undefined;

  private readonly outputRef: {
    current: ClientMethods;
  };
  private readonly tagRef: { current: object };
  private readonly index: number;
  private readonly connection: ClientConnection;

  constructor(
    outputRef: {
      current: ClientMethods;
    },
    tagRef: { current: object },
    index: number,
    connection: ClientConnection,
  ) {
    super();
    this.outputRef = outputRef;
    this.tagRef = tagRef;
    this.index = index;
    this.connection = connection;
  }

  get(_: unknown, prop: string | symbol) {
    if (prop === SYMBOL_GET_OUTPUT) return this.outputRef.current;
    if (prop === SYMBOL_CLIENT_INDEX) return this.index;
    if (prop === INSTANCE_TAG_SYMBOL) return this.tagRef.current;
    const introspection = handleIntrospectionProp(prop, "ClientProxy");
    if (introspection !== false) return introspection;
    const value = this.outputRef.current[prop];
    if (typeof value === "function") {
      this.boundFns ??= new Map();
      let bound = this.boundFns.get(prop);
      if (!bound) {
        bound = getOrCreateProxyFn(prop).bind(
          null,
          this.connection,
          this.outputRef,
        );
        this.boundFns.set(prop, bound);
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
    if (prop === INSTANCE_TAG_SYMBOL) return true;
    return prop in this.outputRef.current;
  }
}

export const useClientResource = <TMethods extends ClientMethods>(
  element: ResourceElement<TMethods>,
): {
  state: InferClientState<TMethods>;
  methods: TMethods;
  key: string | number | undefined;
} => {
  const valueRef = useRef(null as unknown as TMethods);
  const tagRef = useRef(null as unknown as object);

  // The fiber behind useResource is keyed on (hook, key), so the underlying
  // instance is replaced exactly when either changes. The tag mirrors that
  // lifetime while the methods facade below deliberately stays stable across
  // remounts. It advances in the same commit effect as valueRef: a
  // notification delivered before the commit then observes the previous tag
  // together with the previous instance instead of a torn pair.
  const instanceTag = useMemo(() => ({}), [element.hook, element.key]);

  const index = useClientStack().length;
  const { methods, connection } = useMemo(() => {
    const connection: ClientConnection = {
      connected: true,
      generation: 0,
      warnedMethods: undefined,
    };
    return {
      methods: new Proxy<TMethods>(
        {} as TMethods,
        new ClientProxyHandler(valueRef, tagRef, index, connection),
      ),
      connection,
    };
  }, [index]);

  useEffect(() => {
    connection.connected = true;
    const generation = ++connection.generation;
    return () => {
      queueMicrotask(() => {
        if (connection.generation === generation) connection.connected = false;
      });
    };
  }, [connection]);

  const value = useClientStackProvider(methods, function WithClientStack() {
    return useResource(element);
  });

  if (!valueRef.current) {
    valueRef.current = value;
    tagRef.current = instanceTag;
  }

  useEffect(() => {
    valueRef.current = value;
    tagRef.current = instanceTag;
  });

  const state = (value as any).getState?.();
  return { methods, state, key: element.key };
};

export const ClientResource = resource(useClientResource);
