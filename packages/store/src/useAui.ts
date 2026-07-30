"use client";

import {
  flushTapSync,
  useResource,
  useResources,
  useTapHost,
  useTapRoot,
  resource,
  withKey,
  type ResourceElement,
} from "@assistant-ui/tap";
import {
  useMemo,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

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
  IsolatedAssistantClient,
  createRootAssistantClient,
  createIsolatedRootAssistantClient,
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
import { useShallowStable } from "./utils/useShallowStable";
import { createClientAccessor, getClientId } from "./utils/client-accessor";
import { getClientIndex } from "./utils/tap-client-stack-context";

const isDevelopment =
  typeof process !== "undefined" &&
  (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test");

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
  // Swap the sentinel parents for root prototypes to change the error message
  const proto =
    parent === DefaultAssistantClient
      ? createRootAssistantClient()
      : parent === IsolatedAssistantClient
        ? createIsolatedRootAssistantClient()
        : parent;

  const client = Object.create(proto) as AssistantClient;
  Object.assign(client, fields);
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
  return useShallowStable({ source, query: useShallowStable(query) });
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
  const deps = useShallowStable([parent, fields, accessors]);
  const cell = useMemo(
    () => ({}) as { deps?: unknown; client?: AssistantClient },
    [],
  );
  if (cell.deps !== deps) {
    cell.deps = deps;
    cell.client = building;
  }
  return cell.client!;
};

const useAuiRoot = ({
  parent,
  entries,
  clientRef,
  notifications,
}: {
  parent: AssistantClient;
  entries: ScopeEntry[];
  clientRef: ClientRef;
  notifications: NotificationManager;
}): { client: AssistantClient } => {
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

  const accessors = useShallowStable(results.map((r) => r.accessor));

  // Fresh envelope per commit so value-only updates reach the store's
  // subscribers; the client inside keeps its identity
  return {
    client: useCommittedClient({ building, parent, fields, accessors }),
  };
};

const useNotifications = () => useResource(NotificationManager());

const useAssistantClient = ({
  parent,
  entries,
}: {
  parent: AssistantClient;
  entries: ScopeEntry[];
}): AssistantClient => {
  const clientRef = useRef<ClientRef>({ parent, current: null }).current;
  const notifications = useNotifications();

  const store = useTapRoot(function AuiRoot() {
    return useAuiRoot({ parent, entries, clientRef, notifications });
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
  entries: ScopeEntry[];
}): AssistantClient => {
  const { value: client, effects } = useTapHost(function AssistantClientHost() {
    return useAssistantClient(props);
  });

  (client as Record<symbol, unknown>)[AUI_USE_EFFECTS_SYMBOL] = effects;

  return client;
};

// A Derived scope of a derived-only host runs under React's dispatcher: a
// useSyncExternalStore against a bare building client (parent prototype plus
// delegating fields). Mirroring tap's useSyncExternalStore, a throwing
// snapshot keeps the committed value.
const useDerivedScope = (
  building: AssistantClient,
  { name, element }: ScopeEntry,
): ScopeResult => {
  const { get } = element.args[0] as {
    get: (client: AssistantClient) => ClientMethods;
  };

  const cell = useMemo(() => ({}) as { value?: ClientMethods }, []);
  const select = () => {
    try {
      cell.value = get(building);
    } catch (e) {
      if (!("value" in cell)) throw e;
    }
    return cell.value!;
  };
  const value = useSyncExternalStore(building.subscribe, select, select);
  const state = (value as { getState?: () => unknown }).getState?.();

  const meta = useScopeMeta(element);
  const accessor = useMemo(
    () => createAccessor(name, meta, () => value),
    [name, meta, value],
  );

  return useMemo(() => ({ name, accessor, state }), [name, accessor, state]);
};

const useAssembledClient = ({
  parent,
  fields,
  results,
}: {
  parent: AssistantClient;
  fields: ClientFields;
  results: ScopeResult[];
}): AssistantClient => {
  const accessors = useShallowStable(results.map((r) => r.accessor));
  const deps = useShallowStable([parent, fields, accessors]);
  const cell = useMemo(
    () => ({}) as { deps?: unknown; client?: AssistantClient },
    [],
  );
  if (cell.deps !== deps) {
    cell.deps = deps;
    const client = createClientObject(parent, fields);
    for (const { name, accessor } of results) {
      (client as Record<ClientNames, unknown>)[name] = accessor;
    }
    cell.client = client;
  }
  return cell.client!;
};

// Derived-only hosts run without tap: no root, no scheduler, no notification
// manager. Derived gets see only the parent's scopes; subscribe/on delegate
// wholesale to the parent, so emissions and state updates flow through the
// parent's machinery.
const useDerivedOnlyClient = (
  parent: AssistantClient,
  entries: ScopeEntry[],
): AssistantClient => {
  if (isDevelopment) {
    const signature = entries.map((entry) => entry.name).join(",");
    // oxlint-disable-next-line react-hooks/rules-of-hooks -- isDevelopment is constant for the app lifetime
    const committedSignature = useRef(signature).current;
    const root = entries.find((entry) => !isDerivedElement(entry.element));
    if (root) {
      throw new Error(
        `Scope "${root.name}" is a root scope but this useAui mounted derived-only; ` +
          "remount with a new key to change scope kinds.",
      );
    }
    if (committedSignature !== signature) {
      throw new Error(
        `useAui Derived scopes changed between renders (previous: "${committedSignature}", next: "${signature}"); ` +
          "remount with a new key to change the scopes of a derived-only useAui.",
      );
    }
  }

  const fields = useMemo(
    () => ({ subscribe: parent.subscribe, on: parent.on }),
    [parent],
  );
  const building = createClientObject(parent, fields);

  const results = entries.map((entry) =>
    // oxlint-disable-next-line react-hooks/rules-of-hooks -- the Derived set is static per call site (dev invariant above)
    useDerivedScope(building, entry),
  );

  return useAssembledClient({ parent, fields, results });
};

const useScopedClient = (
  parent: AssistantClient,
  clients: useAui.Props,
): AssistantClient => {
  const entries = toScopeEntries(applyTransformScopes(clients, parent));

  // The mode is frozen at mount: the rooted branch handles dynamic scope sets
  // inside tap, the derived-only branch runs fixed per-entry React hooks
  const [rooted] = useState(() =>
    entries.some((entry) => !isDerivedElement(entry.element)),
  );

  if (rooted) {
    // oxlint-disable-next-line react-hooks/rules-of-hooks
    return useHostedAssistantClient({ parent, entries });
  }
  // oxlint-disable-next-line react-hooks/rules-of-hooks
  return useDerivedOnlyClient(parent, entries);
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
export function useAui(clients?: useAui.Props): AssistantClient {
  const parent = useAssistantContextValue();
  if (clients) {
    return useScopedClient(parent, clients);
  }
  return parent;
}
