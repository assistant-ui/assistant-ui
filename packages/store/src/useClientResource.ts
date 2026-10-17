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
import { CLIENT_ID_SYMBOL, INSTANCE_TAG_SYMBOL } from "./utils/client-accessor";
import { useScopedSignal } from "./utils/tap-assistant-context";
import { trackSignal, type ScopedSignal } from "./utils/scoped-signal";

/**
 * Symbol used internally to get state from ClientProxy.
 * This allows getState() to be optional in the user-facing client.
 */
const SYMBOL_GET_OUTPUT = Symbol("assistant-ui.store.getValue");
const SYMBOL_SIGNAL = Symbol("assistant-ui.store.signal");

type ClientInternal = {
  [SYMBOL_GET_OUTPUT]: ClientMethods;
  [SYMBOL_SIGNAL]: ScopedSignal | undefined;
};

export const getClientSignal = (client: ClientMethods) =>
  (client as unknown as ClientInternal)[SYMBOL_SIGNAL];

export const getClientState = (client: ClientMethods) => {
  const output = (client as unknown as ClientInternal)[SYMBOL_GET_OUTPUT];
  if (!output) {
    throw new Error(
      "Client scope contains a non-client resource. " +
        "Ensure your Derived get() returns a client created with useClientResource(), not a plain resource.",
    );
  }
  trackSignal(getClientSignal(client));
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
      // A method reads the render it closes over, whatever it returns
      trackSignal((this as ClientInternal)[SYMBOL_SIGNAL]);
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
  private cachedReceiver: unknown;

  private readonly outputRef: {
    current: ClientMethods;
  };
  private readonly tagRef: { current: object };
  private readonly index: number;
  private readonly signal: ScopedSignal | undefined;
  self: object | undefined;

  constructor(
    outputRef: {
      current: ClientMethods;
    },
    tagRef: { current: object },
    index: number,
    signal: ScopedSignal | undefined,
  ) {
    super();
    this.outputRef = outputRef;
    this.tagRef = tagRef;
    this.index = index;
    this.signal = signal;
  }

  get(_: unknown, prop: string | symbol, receiver: unknown) {
    if (prop === SYMBOL_GET_OUTPUT) return this.outputRef.current;
    if (prop === SYMBOL_SIGNAL) return this.signal;
    if (prop === SYMBOL_CLIENT_INDEX) return this.index;
    if (prop === CLIENT_ID_SYMBOL) return this.self;
    if (prop === INSTANCE_TAG_SYMBOL) return this.tagRef.current;
    const introspection = handleIntrospectionProp(prop, "ClientProxy");
    if (introspection !== false) return introspection;
    const value = this.outputRef.current[prop];
    if (typeof value === "function") {
      // receiver-less reads (getOwnPropertyDescriptor) get the raw method so
      // the bound-fn cache stays keyed on the real receiver
      if (receiver === undefined) return value;
      if (!this.boundFns || this.cachedReceiver !== receiver) {
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
    if (prop === SYMBOL_SIGNAL) return true;
    if (prop === SYMBOL_CLIENT_INDEX) return true;
    if (prop === CLIENT_ID_SYMBOL) return true;
    if (prop === INSTANCE_TAG_SYMBOL) return true;
    return prop in this.outputRef.current;
  }
}

class ForwardingClientProxyHandler extends BaseProxyHandler {
  private readonly targetRef: { current: ClientMethods };
  private readonly signal: ScopedSignal | undefined;

  constructor(
    targetRef: { current: ClientMethods },
    signal: ScopedSignal | undefined,
  ) {
    super();
    this.targetRef = targetRef;
    this.signal = signal;
  }

  get(_: unknown, prop: string | symbol) {
    if (prop === SYMBOL_SIGNAL) return this.signal;
    trackSignal(this.signal);
    return (this.targetRef.current as Record<PropertyKey, unknown>)[prop];
  }

  ownKeys(): ArrayLike<string | symbol> {
    trackSignal(this.signal);
    return Reflect.ownKeys(this.targetRef.current);
  }

  has(_: unknown, prop: string | symbol) {
    trackSignal(this.signal);
    return prop in this.targetRef.current;
  }

  override getOwnPropertyDescriptor(_: unknown, prop: string | symbol) {
    trackSignal(this.signal);
    const value = Reflect.getOwnPropertyDescriptor(
      this.targetRef.current,
      prop,
    )?.value;
    if (value === undefined) return undefined;
    return {
      value,
      writable: false,
      enumerable: true,
      configurable: true,
    };
  }
}

export const useForwardingClient = <TMethods extends ClientMethods>(
  target: TMethods,
): TMethods => {
  const targetRef = useRef(target);
  const { signal, markChanged } = useScopedSignal();
  const methods = useMemo(() => {
    const handler = new ForwardingClientProxyHandler(targetRef, signal);
    return new Proxy<TMethods>({} as TMethods, handler);
  }, [signal]);

  useEffect(() => {
    if (targetRef.current === target) return;
    targetRef.current = target;
    if (signal) markChanged!(signal);
  }, [markChanged, signal, target]);

  return methods;
};

/**
 * Mounts a client resource and returns its stable methods facade and state.
 *
 * Selectors that read this client run again when the resource renders a new
 * output object, so a render that changes its state returns a fresh object
 * rather than one memoized across renders.
 */
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
  const { signal, markChanged } = useScopedSignal();
  const methods = useMemo(() => {
    const handler = new ClientProxyHandler(valueRef, tagRef, index, signal);
    const proxy = new Proxy<TMethods>({} as TMethods, handler);
    handler.self = proxy;
    return proxy;
  }, [index, signal]);

  const value = useClientStackProvider(methods, function WithClientStack() {
    return useResource(element);
  });

  if (!valueRef.current) {
    valueRef.current = value;
    tagRef.current = instanceTag;
  }

  // Marked when the resource renders a new output rather than by comparing
  // snapshots, since getState may return a fresh object on every call
  useEffect(() => {
    const changed =
      valueRef.current !== value || tagRef.current !== instanceTag;
    valueRef.current = value;
    tagRef.current = instanceTag;
    if (changed && signal) markChanged!(signal);
  });

  const state = (value as any).getState?.();
  return { methods, state, key: element.key };
};

export const ClientResource = resource(useClientResource);
