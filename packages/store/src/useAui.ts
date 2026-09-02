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
  useInsertionEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import type {
  AssistantClient,
  AssistantClientAccessor,
  ClientNames,
  ClientMethods,
} from "./types/client";
import { useDerived } from "./Derived";
import {
  useAssistantContextValue,
  useAssistantContextProvider,
  DefaultAssistantClient,
  createRootAssistantClient,
  setTapEffects,
} from "./utils/react-assistant-context";
import type { AuiConfig } from "./AuiConfig";
import { getTransformScopes, type ScopesConfig } from "./attachTransformScopes";
import {
  normalizeEventSelector,
  type AssistantEventName,
  type AssistantEventCallback,
  type AssistantEventSelector,
} from "./types/events";
import {
  useNotificationManager,
  type NotificationManager,
} from "./utils/NotificationManager";
import { useAssistantTapContextProvider } from "./utils/tap-assistant-context";
import { ClientResource } from "./useClientResource";
import { useShallowStable } from "./utils/useShallowStable";
import {
  createClientAccessor,
  getClientId,
  isScopeAvailable,
  isScopeUnavailable,
} from "./utils/client-accessor";
import { createOptionalClientView } from "./utils/optional-client-view";
import { getClientIndex } from "./utils/tap-client-stack-context";
import { isDevelopment } from "./utils/env";

export type ClientRef = {
  parent: AssistantClient;
  current: AssistantClient | null;
};

type ScopeElement = ResourceElement<ClientMethods>;
export type ScopeEntry = [name: ClientNames, element: ScopeElement];
type ScopeMeta = {
  source: ClientNames | "root";
  query: Record<string, unknown>;
};
type ScopeAccessor = AssistantClientAccessor<ClientNames>;

export const applyTransformScopes = (
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

type ClientFields = {
  subscribe: AssistantClient["subscribe"];
  on: AssistantClient["on"];
};

// Rides on the selector object through the parent-chain forwarding in `on`,
// so every level filters delivery against the subscribing provider's own
// committed bindings instead of its own. Module-internal; the public
// selector shape is unchanged.
const EVENT_RECEIVER_REF = Symbol.for("aui.event-receiver-ref");

type RiddenSelector = { [EVENT_RECEIVER_REF]?: ClientRef };

const createClientObject = (
  parent: AssistantClient,
  fields: ClientFields,
): AssistantClient => {
  // Swap the sentinel parent for a root prototype to change the error message
  const proto =
    parent === DefaultAssistantClient ? createRootAssistantClient() : parent;

  const client = Object.create(proto) as AssistantClient;
  Object.assign(client, fields);
  let optional: AssistantClient["optional"] | undefined;
  Object.defineProperty(client, "optional", {
    get: () => (optional ??= createOptionalClientView(client)),
    enumerable: false,
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
        const receiverRef = (selector as RiddenSelector)[EVENT_RECEIVER_REF];

        if (scope !== "*" && !receiverRef) {
          // A hand-built parent may lack the scope entirely; forward to it
          if (isScopeUnavailable(this[scope as ClientNames])) {
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

          // Resolved against the subscribing provider's current client: a
          // structural swap replaces the client identity, and a listener
          // subscribed on an earlier generation still follows the scope's
          // present binding
          const boundScope = ((receiverRef ?? clientRef).current ?? this)[
            scope as ClientNames
          ] as AssistantClientAccessor<ClientNames> | undefined;
          // A scope removed by a structural change since subscription cannot
          // match; resolving its identity would throw
          if (!isScopeAvailable(boundScope)) return;
          const scopeClient = getClientId(
            boundScope,
          ) as unknown as ClientMethods;
          const index = getClientIndex(scopeClient);
          if (scopeClient === clientStack[index]) {
            callback(payload);
          }
        });
        if (scope !== "*") {
          // A ridden subscription filters against the subscriber's bindings,
          // so an ancestor's own scope set says nothing about where the
          // emission lands; forward until the chain leaves generated clients.
          if (receiverRef) {
            if (clientRef.parent === DefaultAssistantClient) return localUnsub;
          } else if (
            isScopeUnavailable(clientRef.parent[scope as ClientNames])
          ) {
            return localUnsub;
          }
        }

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

// Kept separate from useScopeMount: the building-client mutation there makes
// the React Compiler bail, which would leave the resource element unmemoized
const useScopeValue = (element: ScopeElement, derived: boolean) =>
  useResource(derived ? element : ClientResource(element));

const useScopeMount = (
  name: ClientNames,
  element: ScopeElement,
): ScopeAccessor => {
  const building = useAssistantContextValue();

  // A derived element resolves to an existing client; mount it directly
  const derived = isDerivedElement(element);
  const value = useScopeValue(element, derived);

  const methods = derived
    ? (value as ClientMethods)
    : (value as { methods: ClientMethods }).methods;

  const meta = useScopeMeta(element);
  const accessor = useMemo(
    () => createClientAccessor({ name, ...meta }, () => methods),
    [name, meta, methods],
  );

  (building as Record<ClientNames, unknown>)[name] = accessor;

  return accessor;
};

const ScopeMount = resource(useScopeMount);

const useScopeMounts = (entries: ScopeEntry[]): ScopeAccessor[] =>
  useResources(
    entries.map(([name, element]) => withKey(name, ScopeMount(name, element))),
  );

// Commits the freshly built client only when its identity-relevant inputs
// changed: value-only updates keep the committed client's identity, a
// structural change produces a new one
const useCommittedClient = (
  building: AssistantClient,
  deps: readonly unknown[],
): AssistantClient => {
  const stableDeps = useShallowStable(deps);
  const cell = useMemo(
    () => ({}) as { deps?: unknown; client?: AssistantClient },
    [],
  );
  if (cell.deps !== stableDeps) {
    cell.deps = stableDeps;
    cell.client = building;
  }
  return cell.client!;
};

export const useAuiRoot = ({
  parent,
  entries,
  clientRef,
  notifications,
  destroySignal,
}: {
  parent: AssistantClient;
  entries: ScopeEntry[];
  clientRef: ClientRef;
  notifications: NotificationManager;
  destroySignal?: AbortSignal | undefined;
}): { client: AssistantClient } => {
  const fields = useClientFields({ notifications, clientRef });
  const building = createClientObject(parent, fields);
  const tapContext = useMemo(
    () => ({ clientRef, emit: notifications.emit, destroySignal }),
    [clientRef, notifications, destroySignal],
  );

  const accessors = useAssistantTapContextProvider(
    tapContext,
    function WithTapContext() {
      return useAssistantContextProvider(
        building,
        function WithBuildingClient() {
          return useScopeMounts(entries);
        },
      );
    },
  );

  // Fresh envelope per commit so value-only updates reach the store's
  // subscribers; the client inside keeps its identity
  return {
    client: useCommittedClient(building, [parent, ...accessors]),
  };
};

const useHostedAssistantClient = ({
  parent,
  entries,
}: {
  parent: AssistantClient;
  entries: ScopeEntry[];
}): ScopedAuiClient => {
  const clientRef = useRef<ClientRef>({ parent, current: null }).current;
  const { value: client, effects } = useTapHost(function AssistantClientHost() {
    const notifications = useNotificationManager();

    const { client } = useAuiRoot({
      parent,
      entries,
      clientRef,
      notifications,
    });

    useEffect(
      () => parent.subscribe(notifications.notifySubscribers),
      // oxlint-disable-next-line react-hooks/exhaustive-deps -- parent is a prop of the outer hook; the host re-renders with a fresh closure when it changes
      [parent, notifications],
    );

    // Every commit publishes a fresh envelope, so value-only updates reach
    // subscribers here while the client inside keeps its identity
    useEffect(() => notifications.notifySubscribers());

    return client;
  });

  // The only hook that runs before descendant layout effects: a parent's
  // useLayoutEffect fires after its children's, and useEffect leaves the
  // pre-passive window this publication exists to close.
  useInsertionEffect(() => {
    clientRef.parent = parent;
    clientRef.current = client;
  }, [client, parent, clientRef]);

  return { client, effects };
};

// Host for the deprecated useAui({...}) overload: the client tree runs under
// a self-scheduled tap root instead of riding React's scheduler
const useTapRootAssistantClient = ({
  parent,
  entries,
}: {
  parent: AssistantClient;
  entries: ScopeEntry[];
}): ScopedAuiClient => {
  const clientRef = useRef<ClientRef>({ parent, current: null }).current;
  const { value: client, effects } = useTapHost(
    function LegacyAssistantClientHost() {
      const notifications = useNotificationManager();

      const store = useTapRoot(function AuiRoot() {
        return useAuiRoot({ parent, entries, clientRef, notifications });
      });

      const client = useSyncExternalStore(
        store.subscribe,
        () => store.getValue().client,
        () => store.getValue().client,
      );

      // flushTapSync makes structural rebinds triggered by a notification land
      // before the notification returns; the client ref is refreshed in the same
      // window so event delivery resolves scopes against the post-flush client
      useEffect(() => {
        const notify = () =>
          flushTapSync(() => {
            clientRef.current = store.getValue().client;
            notifications.notifySubscribers();
          });
        const unsubscribeStore = store.subscribe(notify);
        const unsubscribeParent = parent.subscribe(notify);
        return () => {
          unsubscribeStore();
          unsubscribeParent();
        };
        // oxlint-disable-next-line react-hooks/exhaustive-deps -- parent is a prop of the outer hook; the host re-renders with a fresh closure when it changes
      }, [store, parent, notifications]);

      return client;
    },
  );

  // The only hook that runs before descendant layout effects: a parent's
  // useLayoutEffect fires after its children's, and useEffect leaves the
  // pre-passive window this publication exists to close.
  useInsertionEffect(() => {
    clientRef.parent = parent;
    clientRef.current = client;
  }, [client, parent, clientRef]);

  return { client, effects };
};

const useDerivedScopeMount = (
  parent: AssistantClient,
  building: AssistantClient,
  name: ClientNames,
  element: ScopeElement,
): ScopeAccessor => {
  // Resolved against the explicit parent (which may live in another React
  // root), never the context client.
  const { get } = element.args[0] as {
    get: (client: AssistantClient) => ClientMethods;
  };
  const value = useSyncExternalStore(
    parent.subscribe,
    () => get(parent),
    () => get(parent),
  );

  const meta = useScopeMeta(element);
  const accessor = useMemo(
    () => createClientAccessor({ name, ...meta }, () => value),
    [name, meta, value],
  );

  (building as Record<ClientNames, unknown>)[name] = accessor;

  return accessor;
};

// Derived-only hosts run without tap: each Derived scope is a plain React
// hook call, so the scope count is fixed per call site (React throws on a
// hook-count change). subscribe delegates wholesale to the parent; on
// delegates transport to the parent while riding the child's ClientRef on
// the selector, so delivery filters against the child's own bindings.
const useDerivedOnlyClient = (
  parent: AssistantClient,
  entries: ScopeEntry[],
): AssistantClient => {
  if (isDevelopment) {
    // oxlint-disable-next-line react-hooks/rules-of-hooks -- isDevelopment is constant for the process lifetime
    const [mountKeys] = useState(() => entries.map(([name]) => name).join(","));
    const root = entries.find(([, element]) => !isDerivedElement(element));
    if (root) {
      throw new Error(
        `Scope "${root[0]}" is a root scope but this useAui mounted derived-only; ` +
          "remount with a new key to change scope kinds.",
      );
    }
    const keys = entries.map(([name]) => name).join(",");
    if (keys !== mountKeys) {
      throw new Error(
        `A derived-only config mounted scopes [${mountKeys}] but now has ` +
          `[${keys}]; remount with a new key to change the scope set.`,
      );
    }
  }

  const clientRef = useRef<ClientRef>({ parent, current: null }).current;

  const on = function <TEvent extends AssistantEventName>(
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
    if (scope === "*") return parent.on(selector, callback);

    // A nested derived-only provider keeps the original subscriber's ref
    const ridden = (selector as RiddenSelector)[EVENT_RECEIVER_REF];
    if (!ridden) {
      if (isScopeUnavailable(this[scope as ClientNames])) {
        throw new Error(
          `Scope "${scope}" is not available. Use { scope: "*", event: "${event}" } to listen globally.`,
        );
      }
    }

    return parent.on(
      {
        scope,
        event,
        [EVENT_RECEIVER_REF]: ridden ?? clientRef,
      } as AssistantEventSelector<TEvent>,
      callback,
    );
  };

  const building = createClientObject(parent, {
    subscribe: parent.subscribe,
    on,
  });

  const accessors = entries.map(([name, element]) =>
    // oxlint-disable-next-line react-hooks/rules-of-hooks -- fixed per call site; React throws on a count change
    useDerivedScopeMount(parent, building, name, element),
  );
  const client = useCommittedClient(building, [parent, ...accessors]);

  useInsertionEffect(() => {
    clientRef.parent = parent;
    clientRef.current = client;
  }, [client, parent, clientRef]);

  return client;
};

type ScopedAuiClient = { client: AssistantClient; effects?: () => void };

const useScopeEntries = (
  parent: AssistantClient,
  clients: AuiConfig.Input,
): { entries: ScopeEntry[]; rooted: boolean } => {
  const entries = Object.entries(
    applyTransformScopes(clients, parent),
  ) as ScopeEntry[];

  // The mode is frozen at mount. The host handles dynamic scope sets; the
  // derived-only branch runs plain hooks, so its scope set is fixed at
  // mount (dev-enforced below). Empty configs mount the host so they can
  // grow scopes without remounting.
  const [rooted] = useState(
    () =>
      entries.length === 0 ||
      entries.some(([, element]) => !isDerivedElement(element)),
  );

  return { entries, rooted };
};

// Creates a client extending an explicit parent (which may live in another
// React root) with the scopes in the config; context is never consulted.
// `effects` (rooted mode only) commits the host — the provider mounts it
// ahead of its children's effects; hosts also self-commit as a fallback.
// `useHost` is fixed per call site.
const useConfiguredAuiImpl = (
  parent: AssistantClient,
  clients: AuiConfig.Input,
  useHost: typeof useHostedAssistantClient,
): ScopedAuiClient => {
  const { entries, rooted } = useScopeEntries(parent, clients);

  if (rooted) {
    // oxlint-disable-next-line react-hooks/rules-of-hooks
    return useHost({ parent, entries });
  }
  // oxlint-disable-next-line react-hooks/rules-of-hooks
  return { client: useDerivedOnlyClient(parent, entries) };
};

export const useConfiguredAui = (
  parent: AssistantClient,
  clients: AuiConfig.Input,
): ScopedAuiClient =>
  useConfiguredAuiImpl(parent, clients, useHostedAssistantClient);

export namespace useAui {
  export type Props = AuiConfig.Input;
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
 *
 * @deprecated Build a config in the component body (`const aui = useAui();
 * const config = AuiConfig({ ... })`) and render `<AuiProvider extends={aui}
 * config={config}>` instead; it creates the client and provides it to the
 * subtree in one step.
 */
export function useAui(clients: useAui.Props): AssistantClient;
export function useAui(clients?: useAui.Props): AssistantClient {
  const parent = useAssistantContextValue();
  if (clients) {
    // oxlint-disable-next-line react-hooks/rules-of-hooks -- fixed per call site
    const { client, effects } = useConfiguredAuiImpl(
      parent,
      clients,
      useTapRootAssistantClient,
    );
    if (effects) setTapEffects(client, effects);
    return client;
  }
  return parent;
}
