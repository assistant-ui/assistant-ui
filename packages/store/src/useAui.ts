"use client";

import {
  useResource,
  useResources,
  useTapHost,
  useTapRoot,
  resource,
  withKey,
  type ResourceElement,
} from "@assistant-ui/tap";
import { useMemo, useEffect, useRef, useState } from "react";

import type {
  AssistantClient,
  AssistantClientAccessor,
  ClientNames,
  ClientElement,
  ClientMethods,
} from "./types/client";
import type { DerivedElement } from "./Derived";
import {
  useAssistantContextValue,
  useAssistantContextProvider,
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
    [PROXIED_ASSISTANT_STATE_SYMBOL]: createProxiedAssistantState(client),
  });

  for (const field of rootFields.clients) {
    (client as any)[field.name] = field;
  }

  return client;
};

// ClientMeta<ClientNames> / Derived.Props<ClientNames> collapse to never over the full union
type AnyDerivedMeta = { source: ClientNames; query: Record<string, unknown> };
type AnyDerivedProps = AnyDerivedMeta & {
  get: (client: AssistantClient) => ClientMethods;
};

const createAccessor = <K extends ClientNames>(
  name: K,
  meta: AnyDerivedMeta,
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

const serializeMeta = (name: ClientNames, meta: AnyDerivedMeta): string => {
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

const useDerivedClientAccessorResource = <K extends ClientNames>({
  element,
  name,
}: {
  element: DerivedElement<K>;
  name: K;
}) => {
  const instance = useResource(
    element as unknown as ResourceElement<ClientMethods>,
  );
  // meta is pinned by the fiber's serializeMeta key
  const [meta] = useState(() => element.args[0] as AnyDerivedMeta);
  return useMemo(
    () => createAccessor(name, meta, () => instance),
    [name, meta, instance],
  );
};

const DerivedClientAccessorResource = resource(
  useDerivedClientAccessorResource,
);

// Client the derived selectors resolve against: sibling derived scopes read
// live so intra-render references see the current pass, not the last commit.
const createResolutionClient = (
  parent: AssistantClient,
  rootFields: RootFields,
  clients: DerivedClients,
): AssistantClient => {
  const client = createClientObject(parent, rootFields);
  for (const [key, element] of Object.entries(clients)) {
    const props = element.args[0] as AnyDerivedProps;
    (client as any)[key] = createAccessor(key as ClientNames, props, () =>
      props.get(client),
    );
  }
  return client;
};

// Constant bailout deps: a scope's fiber re-renders only when its own
// subscription fires or the resolution client changes. A bailed-out render
// serves the committed accessor, which is what keeps a stale leaf readable
// until the parent reconciles it away.
const DERIVED_DEPS: readonly unknown[] = [];

const useDerivedAccessors = (clients: DerivedClients) => {
  return useShallowMemoArray(
    useResources(
      Object.keys(clients).map((key) => {
        const name = key as keyof typeof clients;
        const element = clients[name]!;
        return withKey(
          serializeMeta(name, element.args[0] as AnyDerivedMeta),
          DerivedClientAccessorResource({ element, name }),
          DERIVED_DEPS,
        );
      }),
    ),
  );
};

const useDerivedClientsAccessorsResource = ({
  clients,
  parent,
  rootFields,
}: {
  clients: DerivedClients;
  parent: AssistantClient;
  rootFields: RootFields;
}) => {
  const bindingKey = Object.keys(clients)
    .map((key) =>
      serializeMeta(
        key as ClientNames,
        clients[key as keyof typeof clients]!.args[0] as AnyDerivedMeta,
      ),
    )
    .join("\n");

  const resolutionClient = useMemo(
    () => createResolutionClient(parent, rootFields, clients),
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- clients is keyed by bindingKey; each get is pinned by its meta
    [parent, rootFields, bindingKey],
  );

  return useAssistantContextProvider(
    resolutionClient,
    function WithResolutionClient() {
      return useDerivedAccessors(clients);
    },
  );
};

const useAssistantClient = ({
  parent,
  clients,
}: {
  parent: AssistantClient;
  clients: useAui.Props;
}): AssistantClient => {
  const { rootClients, derivedClients } = useSplitClients(clients, parent);

  const clientRef = useRef<ClientRef>({ parent, current: null }).current;

  useEffect(() => {
    clientRef.current = client;
  });

  const rootFields = useRootFields({ rootClients, clientRef });

  const derivedFields = useDerivedClientsAccessorsResource({
    clients: derivedClients,
    parent,
    rootFields,
  });

  const client = useMemo(() => {
    const client = createClientObject(parent, rootFields);
    for (const field of derivedFields) {
      (client as any)[field.name] = field;
    }
    return client;
  }, [parent, rootFields, derivedFields]);

  if (clientRef.current === null) {
    clientRef.current = client;
  }

  return client;
};

const useHostedAssistantClient = (props: {
  parent: AssistantClient;
  clients: useAui.Props;
}): AssistantClient => {
  const { value: client, effects } = useTapHost(function AssistantClientHost() {
    return useAssistantClient(props);
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
