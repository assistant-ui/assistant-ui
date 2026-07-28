"use client";

import {
  useResource,
  useResources,
  useTapHost,
  useTapRoot,
  resource,
  withKey,
} from "@assistant-ui/tap";
import { useMemo, useEffect, useRef, useSyncExternalStore } from "react";

import type {
  AssistantClient,
  AssistantClientAccessor,
  ClientNames,
  ClientElement,
  ClientMeta,
  ClientMethods,
} from "./types/client";
import type { Derived, DerivedElement } from "./Derived";
import {
  useAssistantContextValue,
  DefaultAssistantClient,
  createRootAssistantClient,
  AUI_USE_EFFECTS_SYMBOL,
} from "./utils/react-assistant-context";
import {
  type DerivedClients,
  type RootClients,
  useSplitClients,
} from "./utils/splitClients";
import {
  normalizeEventSelector,
  type AssistantEventName,
  type AssistantEventCallback,
  type AssistantEventSelector,
} from "./types/events";
import { NotificationManager } from "./utils/NotificationManager";
import { useAssistantTapContextProvider } from "./utils/tap-assistant-context";
import { useClientResource } from "./useClientResource";
import { getClientIndex } from "./utils/tap-client-stack-context";
import {
  PROXIED_ASSISTANT_STATE_SYMBOL,
  createProxiedAssistantState,
} from "./utils/proxied-assistant-state";

type ClientRef = { parent: AssistantClient; current: AssistantClient | null };

const useShallowMemoArray = <T>(array: readonly T[]) => {
  // oxlint-disable-next-line react/exhaustive-deps -- shallow memo over the array itself
  return useMemo(() => array, array);
};

const useRootClientResource = <K extends ClientNames>({
  element,
  emit,
  clientRef,
}: {
  element: ClientElement<K>;
  emit: NotificationManager["emit"];
  clientRef: ClientRef;
}) => {
  const { methods, state } = useAssistantTapContextProvider(
    { clientRef, emit },
    function WithTapContext() {
      return useClientResource(element);
    },
  );
  return useMemo(() => ({ state, methods }), [methods, state]);
};

const useRootClientAccessorResource = <K extends ClientNames>({
  element,
  notifications,
  clientRef,
  name,
}: {
  element: ClientElement<K>;
  notifications: NotificationManager;
  clientRef: ClientRef;
  name: K;
}): AssistantClientAccessor<K> => {
  const store = useTapRoot(function RootClient() {
    return useRootClientResource({
      element,
      emit: notifications.emit,
      clientRef,
    });
  });

  useEffect(() => {
    return store.subscribe(notifications.notifySubscribers);
  }, [store, notifications]);

  return useMemo(() => {
    const clientFunction = () => store.getValue().methods;
    Object.defineProperties(clientFunction, {
      source: {
        value: "root" as const,
        writable: false,
      },
      query: {
        value: {} as Record<string, never>,
        writable: false,
      },
      name: {
        value: name,
        configurable: true,
      },
    });
    return clientFunction as AssistantClientAccessor<K>;
  }, [store, name]);
};

const RootClientAccessorResource = resource(useRootClientAccessorResource);

const useNoOpRootClientsAccessorsResource = () => {
  return useMemo(
    () => ({
      clients: [] as AssistantClientAccessor<ClientNames>[],
      subscribe: undefined,
      on: undefined,
    }),
    [],
  );
};

const NoOpRootClientsAccessorsResource = resource(
  useNoOpRootClientsAccessorsResource,
);

const useRootClientsAccessors = ({
  clients: inputClients,
  clientRef,
}: {
  clients: RootClients;
  clientRef: ClientRef;
}) => {
  const notifications = useResource(NotificationManager());

  useEffect(
    () => clientRef.parent.subscribe(notifications.notifySubscribers),
    [clientRef, notifications],
  );

  const results = useShallowMemoArray(
    useResources(
      Object.keys(inputClients).map((key) =>
        withKey(
          key,
          RootClientAccessorResource({
            element: inputClients[key as keyof typeof inputClients]!,
            notifications,
            clientRef,
            name: key as keyof typeof inputClients,
          }),
        ),
      ),
    ),
  );

  return { notifications, results };
};

const useRootClientsAccessorsResource = (props: {
  clients: RootClients;
  clientRef: ClientRef;
}) => {
  const { clientRef } = props;
  const { notifications, results } = useRootClientsAccessors(props);

  return useMemo(() => {
    return {
      clients: results,
      subscribe: notifications.subscribe,
      on: function <TEvent extends AssistantEventName>(
        this: AssistantClient,
        selector: AssistantEventSelector<TEvent>,
        callback: AssistantEventCallback<TEvent>,
      ) {
        if (!this) {
          throw new Error(
            "const { on } = useAui() is not supported. Use aui.on() instead.",
          );
        }

        const { scope, event } = normalizeEventSelector(selector);

        if (scope !== "*") {
          const source = this[scope as ClientNames].source;
          if (source === null) {
            throw new Error(
              `Scope "${scope}" is not available. Use { scope: "*", event: "${event}" } to listen globally.`,
            );
          }
        }

        const localUnsub = notifications.on(event, (payload, clientStack) => {
          if (scope === "*") {
            callback(payload);
            return;
          }

          const scopeClient = this[scope as ClientNames]();
          const index = getClientIndex(scopeClient);
          if (scopeClient === clientStack[index]) {
            callback(payload);
          }
        });
        if (
          scope !== "*" &&
          clientRef.parent[scope as ClientNames].source === null
        )
          return localUnsub;

        const parentUnsub = clientRef.parent.on(selector, callback);

        return () => {
          localUnsub();
          parentUnsub();
        };
      },
    };
  }, [results, notifications, clientRef]);
};

const RootClientsAccessorsResource = resource(useRootClientsAccessorsResource);

const serializeMeta = <K extends ClientNames>(
  name: K,
  meta: ClientMeta<K>,
): string => {
  // Sort top-level keys so {a, b} and {b, a} hash to the same fiber
  // identity, and guard JSON.stringify against unusual values (BigInt,
  // circular refs) so render never throws here.
  let queryKey: string;
  try {
    const sorted: Record<string, unknown> = {};
    for (const k of Object.keys(meta.query as object).sort()) {
      sorted[k] = (meta.query as Record<string, unknown>)[k];
    }
    queryKey = JSON.stringify(sorted);
  } catch {
    queryKey = String(meta.query);
  }
  return `${name}::${meta.source}::${queryKey}`;
};

/**
 * Resource that creates the root client accessors.
 */
const useRootFields = ({
  rootClients,
  clientRef,
}: {
  rootClients: RootClients;
  clientRef: ClientRef;
}) => {
  return useResource(
    Object.keys(rootClients).length > 0
      ? RootClientsAccessorsResource({ clients: rootClients, clientRef })
      : NoOpRootClientsAccessorsResource(),
  );
};

type RootFields = ReturnType<typeof useRootFields>;

const createClientObject = (
  parent: AssistantClient,
  rootFields: RootFields,
): AssistantClient => {
  // Swap DefaultAssistantClient -> createRootAssistantClient at root to change error message
  const proto =
    parent === DefaultAssistantClient ? createRootAssistantClient() : parent;

  const client = Object.create(proto) as AssistantClient;
  Object.assign(client, {
    subscribe: rootFields.subscribe ?? parent.subscribe,
    on: rootFields.on ?? parent.on,
  });

  for (const field of rootFields.clients) {
    (client as any)[field.name] = field;
  }

  return client;
};

const makeBoundAccessor = <K extends ClientNames>(
  name: K,
  meta: ClientMeta<K>,
  read: () => ClientMethods,
): AssistantClientAccessor<K> => {
  const clientFunction = () => read();
  Object.defineProperties(clientFunction, {
    source: {
      value: meta.source,
    },
    query: {
      value: meta.query,
    },
    name: {
      value: name,
      configurable: true,
    },
  });
  return clientFunction as AssistantClientAccessor<K>;
};

const UNRESOLVED = Symbol("assistant-ui.store.unresolved");

const arrayShallowEqual = (a: readonly unknown[], b: readonly unknown[]) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!Object.is(a[i], b[i])) return false;
  }
  return true;
};

type DerivedPropsRef = { current: DerivedClients };

const createBindingStore = ({
  parent,
  rootFields,
  names,
  propsRef,
}: {
  parent: AssistantClient;
  rootFields: RootFields;
  names: readonly ClientNames[];
  propsRef: DerivedPropsRef;
}) => {
  const getProps = (i: number) =>
    propsRef.current[names[i]!]!.args[0] as Derived.Props<ClientNames>;

  let pass: ((i: number) => ClientMethods) | null = null;

  const resolutionClient = createClientObject(parent, rootFields);
  names.forEach((name, i) => {
    (resolutionClient as any)[name] = makeBoundAccessor(
      name,
      getProps(i),
      () => {
        if (!pass) {
          throw new Error(
            `Derived scope "${name}" cannot be read outside a resolution pass`,
          );
        }
        return pass(i);
      },
    );
  });

  let last: ClientMethods[] | null = null;

  const getSnapshot = (): ClientMethods[] => {
    const next: (ClientMethods | typeof UNRESOLVED)[] = names.map(
      () => UNRESOLVED,
    );
    const resolveAt = (i: number): ClientMethods => {
      const existing = next[i];
      if (existing !== UNRESOLVED) return existing as ClientMethods;
      const instance = getProps(i).get(resolutionClient);
      next[i] = instance;
      return instance;
    };
    pass = resolveAt;
    try {
      for (let i = 0; i < names.length; i++) {
        if (next[i] !== UNRESOLVED) continue;
        try {
          resolveAt(i);
        } catch (error) {
          // A stale scope keeps its bound instance until the parent reconciles this subtree away
          if (!last) throw error;
          next[i] = last[i]!;
        }
      }
    } finally {
      pass = null;
    }

    const resolved = next as ClientMethods[];
    if (last && arrayShallowEqual(last, resolved)) return last;
    last = resolved;
    return resolved;
  };

  return { names, getSnapshot };
};

const EMPTY_DERIVED_CLIENTS: DerivedClients = {};

const useHostedAssistantClient = ({
  parent,
  clients,
}: {
  parent: AssistantClient;
  clients: useAui.Props;
}): AssistantClient => {
  const { rootClients, derivedClients } = useSplitClients(clients, parent);

  const clientRef = useRef<ClientRef>({
    parent,
    current: null,
  }).current;
  clientRef.parent = parent;

  const { value: rootFields, effects } = useTapHost(
    function AssistantClientHost() {
      return useRootFields({ rootClients, clientRef });
    },
  );

  const propsRef = useRef(EMPTY_DERIVED_CLIENTS);
  propsRef.current = derivedClients;

  const names = Object.keys(derivedClients) as ClientNames[];
  const bindingKey = names
    .map((name) =>
      serializeMeta(
        name,
        derivedClients[name]!.args[0] as ClientMeta<ClientNames>,
      ),
    )
    .join("\n");

  const store = useMemo(
    () => createBindingStore({ parent, rootFields, names, propsRef }),
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- names is keyed by bindingKey
    [parent, rootFields, bindingKey],
  );

  const subscribe = rootFields.subscribe ?? parent.subscribe;
  const bindings = useSyncExternalStore(
    subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );

  const client = useMemo(() => {
    const client = createClientObject(parent, rootFields);
    store.names.forEach((name, i) => {
      const instance = bindings[i]!;
      (client as any)[name] = makeBoundAccessor(
        name,
        propsRef.current[name]!.args[0] as ClientMeta<ClientNames>,
        () => instance,
      );
    });
    Object.assign(client, {
      [PROXIED_ASSISTANT_STATE_SYMBOL]: createProxiedAssistantState(client),
    });
    return client;
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- propsRef reads are keyed by store
  }, [parent, rootFields, store, bindings]);

  if (clientRef.current === null) {
    clientRef.current = client;
  }

  useEffect(() => {
    clientRef.current = client;
  });

  (client as Record<symbol, unknown>)[AUI_USE_EFFECTS_SYMBOL] = effects;

  return client;
};

export namespace useAui {
  export type Props = {
    [K in ClientNames]?: ClientElement<K> | DerivedElement<K>;
  };
}

/**
 * Returns the current `AssistantClient` from context.
 *
 * Read the client supplied by the nearest {@link AuiProvider} or
 * {@link AssistantRuntimeProvider}, then access a scope on it —
 * `aui.thread()`, `aui.composer()`, `aui.message()`, and so on. Pair
 * with {@link useAuiState} to read reactive state and {@link useAuiEvent}
 * to subscribe to events. The returned client also exposes lower-level
 * methods such as `aui.on(...)` and `aui.subscribe(...)`; prefer
 * `useAuiEvent` for React event subscriptions.
 *
 * Rendered outside a provider, the returned client's scope accessors
 * throw a descriptive error whenever they are called.
 *
 * @example
 * ```tsx
 * const aui = useAui();
 *
 * const onSend = () => aui.composer().send();
 * const onCancel = () => aui.thread().cancelRun();
 * ```
 *
 * @example
 * ```tsx
 * // Combine with useAuiState to drive disabled state.
 * const aui = useAui();
 * const isRunning = useAuiState((s) => s.thread.isRunning);
 *
 * return (
 *   <button disabled={isRunning} onClick={() => aui.composer().send()}>
 *     Send
 *   </button>
 * );
 * ```
 */
export function useAui(): AssistantClient;
/**
 * Extends the parent `AssistantClient` with additional scopes.
 *
 * Advanced overload used when building primitives or providers — for example,
 * when a custom provider needs to register a `message`, `part`, or other scope
 * onto the client visible to its descendants. Application code rarely reaches
 * for this; use {@link useAui} with no arguments to read the existing client.
 *
 * Derived scopes are resolved during render and bound into the returned
 * client. The client is immutable: state updates inside a bound instance
 * never change its identity, while a structural change (the scope resolving
 * to a different instance) produces a new client and re-renders consumers
 * through React.
 *
 * @example
 * ```tsx
 * const aui = useAui({
 *   message: Derived({
 *     source: "thread",
 *     query: { index: 0 },
 *     get: (aui) => aui.thread().message({ index: 0 }),
 *   }),
 * });
 *
 * const role = useAuiState((s) => s.message.role);
 * ```
 */
export function useAui(clients: useAui.Props): AssistantClient;
/**
 * Extends an explicit parent `AssistantClient` with additional scopes.
 */
export function useAui(
  clients: useAui.Props,
  config: { parent: null | AssistantClient },
): AssistantClient;
/** @deprecated This API is highly experimental and may be changed in a minor release */
export function useAui(
  clients?: useAui.Props,
  { parent }: { parent: null | AssistantClient } = {
    parent: useAssistantContextValue(),
  },
): AssistantClient {
  if (clients) {
    return useHostedAssistantClient({
      parent: parent ?? DefaultAssistantClient,
      clients,
    });
  }
  if (parent === null)
    throw new Error("received null parent, this usage is not allowed");
  return parent;
}
