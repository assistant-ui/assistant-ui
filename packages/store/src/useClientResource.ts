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
import { useAssistantClientDestroySignal } from "./utils/tap-assistant-context";
import { shallowEqual } from "./utils/shallow-equal";

/**
 * Symbol used internally to get state from ClientProxy.
 * This allows getState() to be optional in the user-facing client.
 */
const SYMBOL_GET_OUTPUT = Symbol("assistant-ui.store.getValue");
const SYMBOL_SUBSCRIBE = Symbol("assistant-ui.store.subscribe");

type ClientInternal = {
  [SYMBOL_GET_OUTPUT]: ClientMethods;
  [SYMBOL_SUBSCRIBE]?: ((callback: () => void) => () => void) | undefined;
};

let clientDependencyCollector: Set<ClientMethods> | null = null;

export const collectClientDependencies = <T>(callback: () => T) => {
  const previousCollector = clientDependencyCollector;
  const dependencies = new Set<ClientMethods>();
  clientDependencyCollector = dependencies;
  try {
    return { value: callback(), dependencies: [...dependencies] };
  } finally {
    clientDependencyCollector = previousCollector;
    if (previousCollector) {
      for (const dependency of dependencies) {
        previousCollector.add(dependency);
      }
    }
  }
};

export const trackClientDependency = (client: ClientMethods) => {
  clientDependencyCollector?.add(client);
};

export const subscribeToClient = (
  client: ClientMethods,
  callback: () => void,
) => {
  return (client as unknown as ClientInternal)[SYMBOL_SUBSCRIBE]?.(callback);
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

const isShallowComparable = (value: object) => {
  if (Array.isArray(value)) return true;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
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
      const result = method(...args);
      const returnsClient =
        result !== null &&
        (typeof result === "object" || typeof result === "function") &&
        INSTANCE_TAG_SYMBOL in result;
      if (!returnsClient) trackClientDependency(this as ClientMethods);
      return result;
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
  private readonly subscribe:
    | ((callback: () => void) => () => void)
    | undefined;

  constructor(
    outputRef: {
      current: ClientMethods;
    },
    tagRef: { current: object },
    index: number,
    subscribe: ((callback: () => void) => () => void) | undefined,
  ) {
    super();
    this.outputRef = outputRef;
    this.tagRef = tagRef;
    this.index = index;
    this.subscribe = subscribe;
  }

  get(_: unknown, prop: string | symbol, receiver: unknown) {
    if (prop === SYMBOL_GET_OUTPUT) return this.outputRef.current;
    if (prop === SYMBOL_SUBSCRIBE) return this.subscribe;
    if (prop === SYMBOL_CLIENT_INDEX) return this.index;
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
    if (prop === SYMBOL_SUBSCRIBE) return true;
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
  const subscribers = useMemo(() => new Set<() => void>(), []);
  // Standalone Vue and Svelte scopes use createLastValidCache, whose shrink
  // recovery requires every store notification. React scopes do not use that
  // cache and can subscribe directly to only the clients their selector reads.
  const directSubscriptionsEnabled =
    useAssistantClientDestroySignal() === undefined;
  const subscribe = useMemo(
    () =>
      directSubscriptionsEnabled
        ? (callback: () => void) => {
            subscribers.add(callback);
            return () => subscribers.delete(callback);
          }
        : undefined,
    [directSubscriptionsEnabled, subscribers],
  );

  // The fiber behind useResource is keyed on (hook, key), so the underlying
  // instance is replaced exactly when either changes. The tag mirrors that
  // lifetime while the methods facade below deliberately stays stable across
  // remounts. It advances in the same commit effect as valueRef: a
  // notification delivered before the commit then observes the previous tag
  // together with the previous instance instead of a torn pair.
  const instanceTag = useMemo(() => ({}), [element.hook, element.key]);

  const index = useClientStack().length;
  const methods = useMemo(
    () =>
      new Proxy<TMethods>(
        {} as TMethods,
        new ClientProxyHandler(valueRef, tagRef, index, subscribe),
      ),
    [index, subscribe],
  );

  const value = useClientStackProvider(methods, function WithClientStack() {
    return useResource(element);
  });
  const state = (value as any).getState?.();
  const stateRef = useRef(state);

  if (!valueRef.current) {
    valueRef.current = value;
    tagRef.current = instanceTag;
  }

  useEffect(() => {
    const previousState = stateRef.current;
    // Plain immutable snapshots can suppress equivalent updates by their
    // top-level fields. Other state shapes use identity because Object.keys
    // does not describe class instances or prototype-backed properties.
    const stateChanged =
      !Object.is(previousState, state) &&
      (typeof previousState !== "object" ||
        previousState === null ||
        typeof state !== "object" ||
        state === null ||
        !isShallowComparable(previousState) ||
        !isShallowComparable(state) ||
        !shallowEqual(previousState, state));
    const changed = tagRef.current !== instanceTag || stateChanged;
    valueRef.current = value;
    tagRef.current = instanceTag;
    stateRef.current = state;
    if (changed) {
      for (const callback of subscribers) callback();
    }
  }, [instanceTag, state, subscribers, value]);

  useEffect(
    () => () => {
      for (const callback of subscribers) callback();
    },
    [subscribers],
  );

  return { methods, state, key: element.key };
};

export const ClientResource = resource(useClientResource);
