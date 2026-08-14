import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
const SYMBOL_CONNECTION_PHASE = Symbol("assistant-ui.store.connectionPhase");

type ClientConnectionPhase = "connected" | "cleanup" | "disconnected";

type ClientInternal = {
  [SYMBOL_GET_OUTPUT]: ClientMethods;
  [SYMBOL_CONNECTION_PHASE]: ClientConnectionPhase;
};

const cleanupSafeClientMethods = new WeakSet<ClientMethods[string]>();

/**
 * @deprecated Experimental. Marks a client method as callable while
 * descendant effects clean up. Do not depend on this lifecycle API.
 */
export const unstable_allowClientMethodDuringCleanup = <
  TMethod extends ClientMethods[string],
>(
  method: TMethod,
): TMethod => {
  cleanupSafeClientMethods.add(method);
  return method;
};

const isCleanupSafeMethod = (
  method: ClientMethods[string] | undefined,
): boolean => method !== undefined && cleanupSafeClientMethods.has(method);

let clientReadDepth = 0;
export const runClientRead = <T>(read: () => T): T => {
  clientReadDepth++;
  try {
    return read();
  } finally {
    clientReadDepth--;
  }
};

export const getClientState = (client: ClientMethods) => {
  const output = (client as unknown as ClientInternal)[SYMBOL_GET_OUTPUT];
  if (!output) {
    throw new Error(
      "Client scope contains a non-client resource. " +
        "Ensure your Derived get() returns a client created with useClientResource(), not a plain resource.",
    );
  }
  return runClientRead(() => (output as any).getState?.());
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

      const connectionPhase = (this as ClientInternal)[SYMBOL_CONNECTION_PHASE];
      const isRead =
        prop === "getState" || prop === "subscribe" || clientReadDepth > 0;
      if (!isRead && connectionPhase === "disconnected") {
        console.warn(
          `Cannot call "${String(prop)}" on a disconnected AuiClient. This call was ignored.`,
        );
        return undefined;
      }

      const method = output[prop];
      if (
        !isRead &&
        connectionPhase === "cleanup" &&
        !isCleanupSafeMethod(method)
      ) {
        console.warn(
          `Cannot call "${String(prop)}" on a disconnected AuiClient. This call was ignored.`,
        );
        return undefined;
      }

      if (!method)
        throw new Error(`Method "${String(prop)}" is not implemented.`);
      if (typeof method !== "function")
        throw new Error(`"${String(prop)}" is not a function.`);
      return prop === "getState"
        ? runClientRead(() => method(...args))
        : method(...args);
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
  private cachedReceiver: unknown;
  private descriptorReceiver: object | undefined;

  private readonly outputRef: {
    current: ClientMethods;
  };
  private readonly connectionPhaseRef: { current: ClientConnectionPhase };
  private readonly tagRef: { current: object };
  private readonly index: number;

  constructor(
    outputRef: {
      current: ClientMethods;
    },
    connectionPhaseRef: { current: ClientConnectionPhase },
    tagRef: { current: object },
    index: number,
  ) {
    super();
    this.outputRef = outputRef;
    this.connectionPhaseRef = connectionPhaseRef;
    this.tagRef = tagRef;
    this.index = index;
  }

  createProxy<TMethods extends ClientMethods>(): TMethods {
    const proxy = new Proxy<TMethods>({} as TMethods, this);
    this.descriptorReceiver = proxy;
    return proxy;
  }

  get(_: unknown, prop: string | symbol, receiver: unknown) {
    if (prop === SYMBOL_GET_OUTPUT) return this.outputRef.current;
    if (prop === SYMBOL_CONNECTION_PHASE)
      return this.connectionPhaseRef.current;
    if (prop === SYMBOL_CLIENT_INDEX) return this.index;
    if (prop === INSTANCE_TAG_SYMBOL) return this.tagRef.current;
    const introspection = handleIntrospectionProp(prop, "ClientProxy");
    if (introspection !== false) return introspection;
    const value = this.outputRef.current[prop];
    if (typeof value === "function") {
      // Descriptor reads have no receiver; bind them through the stable proxy
      // so they retain the same lifecycle guard as ordinary property reads.
      const effectiveReceiver = receiver ?? this.descriptorReceiver;
      if (!effectiveReceiver) {
        throw new Error("ClientProxy accessed before initialization.");
      }
      if (!this.boundFns || this.cachedReceiver !== effectiveReceiver) {
        this.boundFns = new Map();
        this.cachedReceiver = effectiveReceiver;
      }
      let bound = this.boundFns!.get(prop);
      if (!bound) {
        bound = getOrCreateProxyFn(prop).bind(effectiveReceiver);
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
    if (prop === SYMBOL_CONNECTION_PHASE) return true;
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
  const connectionPhaseRef = useRef<ClientConnectionPhase>("connected");
  const [connectionLifecycle] = useState(() => ({ generation: 0 }));
  const tagRef = useRef(null as unknown as object);

  // The fiber behind useResource is keyed on (hook, key), so the underlying
  // instance is replaced exactly when either changes. The tag mirrors that
  // lifetime while the methods facade below deliberately stays stable across
  // remounts. It advances in the same commit effect as valueRef: a
  // notification delivered before the commit then observes the previous tag
  // together with the previous instance instead of a torn pair.
  const instanceTag = useMemo(() => ({}), [element.hook, element.key]);

  const index = useClientStack().length;
  const methods = useMemo(() => {
    const handler = new ClientProxyHandler(
      valueRef,
      connectionPhaseRef,
      tagRef,
      index,
    );
    return handler.createProxy<TMethods>();
  }, [index]);

  useLayoutEffect(() => {
    ++connectionLifecycle.generation;
    connectionPhaseRef.current = "connected";
  }, [connectionLifecycle]);

  useEffect(() => {
    const generation = connectionLifecycle.generation;
    return () => {
      // Cancellation remains available while descendant effects clean up.
      connectionPhaseRef.current = "cleanup";
      queueMicrotask(() => {
        if (connectionLifecycle.generation === generation) {
          connectionPhaseRef.current = "disconnected";
        }
      });
    };
  }, [connectionLifecycle]);

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
