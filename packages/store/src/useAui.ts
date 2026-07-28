"use client";

import {
  flushTapSync,
  useResource,
  useTapHost,
  useTapRoot,
  resource,
  type ResourceElement,
} from "@assistant-ui/tap";
import { useMemo, useEffect, useRef, useSyncExternalStore } from "react";

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
import { getTransformScopes, type ScopesConfig } from "./attachTransformScopes";
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

type ScopeElement = ResourceElement<ClientMethods>;
type ScopeEntry = { name: ClientNames; element: ScopeElement };
type ScopeMeta = {
  source: ClientNames | "root";
  query: Record<string, unknown>;
};
type ScopeResult = {
  name: ClientNames;
  accessor: AssistantClientAccessor<ClientNames>;
  state: unknown;
};

const applyTransformScopes = (
  clients: useAui.Props,
  parent: AssistantClient,
): Record<string, ScopeElement> => {
  const scopes = { ...clients } as Record<string, ScopeElement>;
  const visited = new Set<ScopeElement["hook"]>();

  let changed = true;
  while (changed) {
    changed = false;
    for (const element of Object.values(scopes)) {
      if (visited.has(element.hook)) continue;
      visited.add(element.hook);

      const transform = getTransformScopes(element.hook);
      if (transform) {
        transform(scopes as ScopesConfig, parent);
        changed = true;
        break;
      }
    }
  }

  return scopes;
};

const metaOf = (element: ScopeElement): ScopeMeta => {
  const props = element.args[0] as Partial<ScopeMeta> | undefined;
  return {
    source: typeof props?.source === "string" ? props.source : "root",
    query: props?.query ?? {},
  };
};

const toScopeEntries = (scopes: Record<string, ScopeElement>): ScopeEntry[] =>
  (Object.entries(scopes) as [ClientNames, ScopeElement][]).map(
    ([name, element]) => ({ name, element }),
  );

const createAccessor = <K extends ClientNames>(
  name: K,
  meta: ScopeMeta,
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

type ClientFields = {
  subscribe: AssistantClient["subscribe"];
  on: AssistantClient["on"];
};

const createClientObject = (
  parent: AssistantClient,
  fields: ClientFields,
): AssistantClient => {
  // Swap DefaultAssistantClient -> createRootAssistantClient at root to change error message
  const proto =
    parent === DefaultAssistantClient ? createRootAssistantClient() : parent;

  const client = Object.create(proto) as AssistantClient;
  Object.assign(client, {
    ...fields,
    [PROXIED_ASSISTANT_STATE_SYMBOL]: createProxiedAssistantState(client),
  });
  return client;
};

const useClientFields = ({
  notifications,
  clientRef,
}: {
  notifications: NotificationManager;
  clientRef: ClientRef;
}): ClientFields => {
  return useMemo(
    () => ({
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
    }),
    [notifications, clientRef],
  );
};

const useScopeMeta = (element: ScopeElement): ScopeMeta => {
  const { source, query } = metaOf(element);
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- shallow memo over the query's entries
  return useMemo(
    () => ({ source, query }),
    [source, ...Object.entries(query).flat()],
  );
};

const EMPTY_CHAIN: ScopeResult[] = [];
const useScopeChainEnd = () => EMPTY_CHAIN;
const ScopeChainEnd = resource(useScopeChainEnd);

type ScopeChainProps = {
  entries: ScopeEntry[];
  index: number;
  client: AssistantClient;
};

const useScopeChainRest = (props: ScopeChainProps): ScopeResult[] => {
  return useResource(
    props.index < props.entries.length
      ? ScopeChainResource(props)
      : ScopeChainEnd(),
  );
};

const useScopeChain = ({
  entries,
  index,
  client,
}: ScopeChainProps): ScopeResult[] => {
  const { name, element } = entries[index]!;

  const { methods, state } = useAssistantContextProvider(
    client,
    function WithScopeClient() {
      return useClientResource(element);
    },
  );

  const meta = useScopeMeta(element);
  const accessor = useMemo(
    () => createAccessor(name, meta, () => methods),
    [name, meta, methods],
  );

  const nextClient = useMemo(() => {
    const next = Object.create(client) as AssistantClient;
    Object.assign(next, {
      [name]: accessor,
      [PROXIED_ASSISTANT_STATE_SYMBOL]: createProxiedAssistantState(next),
    });
    return next;
  }, [client, name, accessor]);

  const rest = useScopeChainRest({
    entries,
    index: index + 1,
    client: nextClient,
  });

  return useMemo(
    () => [{ name, accessor, state }, ...rest],
    [name, accessor, state, rest],
  );
};

const ScopeChainResource = resource(useScopeChain);

const useComposedClient = ({
  parent,
  fields,
  results,
}: {
  parent: AssistantClient;
  fields: ClientFields;
  results: ScopeResult[];
}): AssistantClient => {
  return useMemo(() => {
    const client = createClientObject(parent, fields);
    for (const { name, accessor } of results) {
      (client as Record<ClientNames, unknown>)[name] = accessor;
    }
    return client;
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- keyed on the identity of every scope accessor
  }, [parent, fields, ...results.map((r) => r.accessor)]);
};

const useAuiRoot = ({
  parent,
  clients,
  clientRef,
  notifications,
}: {
  parent: AssistantClient;
  clients: useAui.Props;
  clientRef: ClientRef;
  notifications: NotificationManager;
}): { client: AssistantClient } => {
  const entries = toScopeEntries(applyTransformScopes(clients, parent));

  const fields = useClientFields({ notifications, clientRef });
  const baseClient = useMemo(
    () => createClientObject(parent, fields),
    [parent, fields],
  );

  const results = useAssistantTapContextProvider(
    { clientRef, emit: notifications.emit },
    function WithTapContext() {
      return useScopeChainRest({ entries, index: 0, client: baseClient });
    },
  );

  // Fresh envelope per commit so value-only updates reach the store's
  // subscribers; the client inside keeps its identity
  return { client: useComposedClient({ parent, fields, results }) };
};

const useNotifications = () => useResource(NotificationManager());

const useAssistantClient = ({
  parent,
  clients,
}: {
  parent: AssistantClient;
  clients: useAui.Props;
}): AssistantClient => {
  const clientRef = useRef<ClientRef>({ parent, current: null }).current;
  const notifications = useNotifications();

  const store = useTapRoot(function AuiRoot() {
    return useAuiRoot({ parent, clients, clientRef, notifications });
  });

  const client = useSyncExternalStore(
    store.subscribe,
    () => store.getValue().client,
    () => store.getValue().client,
  );

  // flushTapSync makes structural rebinds triggered by a notification land
  // before the notification returns
  useEffect(
    () => store.subscribe(() => flushTapSync(notifications.notifySubscribers)),
    [store, notifications],
  );
  useEffect(
    () => parent.subscribe(() => flushTapSync(notifications.notifySubscribers)),
    [parent, notifications],
  );

  useEffect(() => {
    clientRef.parent = parent;
    clientRef.current = client;
  });

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
