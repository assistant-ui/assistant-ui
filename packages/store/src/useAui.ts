"use client";

import {
  flushTapSync,
  useMemoCache,
  useResource,
  useResources,
  useTapHost,
  useTapRoot,
  resource,
  withKey,
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
import { useDerived, type DerivedElement } from "./Derived";
import {
  useAssistantContextValue,
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
import {
  useAssistantTapContextProvider,
  useBuildingClientProvider,
  useBuildingClient,
} from "./utils/tap-assistant-context";
import { ClientResource } from "./useClientResource";
import { createClientAccessor, getClientId } from "./utils/client-accessor";
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

const isDerivedElement = (element: ScopeElement) =>
  element.hook === (useDerived as unknown);

const metaOf = (element: ScopeElement): ScopeMeta => {
  if (!isDerivedElement(element)) return { source: "root", query: {} };
  const props = element.args[0] as ScopeMeta;
  return { source: props.source, query: props.query ?? {} };
};

const toScopeEntries = (scopes: Record<string, ScopeElement>): ScopeEntry[] =>
  (Object.entries(scopes) as [ClientNames, ScopeElement][]).map(
    ([name, element]) => ({ name, element }),
  );

const createAccessor = <K extends ClientNames>(
  name: K,
  meta: ScopeMeta,
  read: () => ClientMethods,
): AssistantClientAccessor<K> =>
  createClientAccessor<K>({ name, ...meta }, read);

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

          const scopeClient = getClientId(
            this[scope as ClientNames],
          ) as unknown as ClientMethods;
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

const useScopeValue = (element: ScopeElement, derived: boolean) =>
  useResource(derived ? element : ClientResource(element));

const useScopeMount = ({ name, element }: ScopeEntry): ScopeResult => {
  const client = useBuildingClient();

  // A derived element resolves to an existing client; mount it directly
  const derived = isDerivedElement(element);
  const value = useScopeValue(element, derived);

  const methods = derived
    ? (value as ClientMethods)
    : (value as { methods: ClientMethods }).methods;
  const state = derived
    ? (value as { getState?: () => unknown }).getState?.()
    : (value as { state: unknown }).state;

  const meta = useScopeMeta(element);
  const accessor = useMemo(
    () => createAccessor(name, meta, () => methods),
    [name, meta, methods],
  );

  // Only fill vacant slots so a re-render never mutates an already-built client
  if (!Object.hasOwn(client, name)) {
    (client as Record<ClientNames, unknown>)[name] = accessor;
  }

  return useMemo(() => ({ name, accessor, state }), [name, accessor, state]);
};

const ScopeMount = resource(useScopeMount);

const useScopeMounts = (entries: ScopeEntry[]): ScopeResult[] =>
  useResources(entries.map((entry) => withKey(entry.name, ScopeMount(entry))));

const MEMO_CACHE_UNFILLED = Symbol.for("react.memo_cache_sentinel");

const useStableArray = <T>(values: readonly T[]): readonly T[] => {
  const cache = useMemoCache(1) as [readonly T[] | typeof MEMO_CACHE_UNFILLED];
  const prev = cache[0];
  if (
    prev !== MEMO_CACHE_UNFILLED &&
    prev.length === values.length &&
    values.every((value, i) => Object.is(value, prev[i]))
  ) {
    return prev;
  }
  cache[0] = values;
  return values;
};

const useCommittedClient = ({
  building,
  parent,
  fields,
  accessors,
}: {
  building: AssistantClient;
  parent: AssistantClient;
  fields: ClientFields;
  accessors: readonly AssistantClientAccessor<ClientNames>[];
}): AssistantClient => {
  const deps = useStableArray([parent, fields, accessors]);
  const cache = useMemoCache(2) as [
    readonly unknown[] | typeof MEMO_CACHE_UNFILLED,
    AssistantClient,
  ];
  if (cache[0] !== deps) {
    cache[0] = deps;
    cache[1] = building;
  }
  return cache[1];
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
  const building = createClientObject(parent, fields);

  const results = useAssistantTapContextProvider(
    { clientRef, emit: notifications.emit },
    function WithTapContext() {
      return useBuildingClientProvider(building, function WithBuildingClient() {
        return useScopeMounts(entries);
      });
    },
  );

  const accessors = useStableArray(results.map((r) => r.accessor));

  // Fresh envelope per commit so value-only updates reach the store's
  // subscribers; the client inside keeps its identity
  return {
    client: useCommittedClient({ building, parent, fields, accessors }),
  };
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
 * `aui.thread`, `aui.composer`, `aui.message`, and so on. Pair
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
 * const onSend = () => aui.composer.send();
 * const onCancel = () => aui.thread.cancelRun();
 * ```
 *
 * @example
 * ```tsx
 * // Combine with useAuiState to drive disabled state.
 * const aui = useAui();
 * const isRunning = useAuiState((s) => s.thread.isRunning);
 *
 * return (
 *   <button disabled={isRunning} onClick={() => aui.composer.send()}>
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
 *     get: (aui) => aui.thread.message({ index: 0 }),
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
