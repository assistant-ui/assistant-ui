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
import { createClientAccessor, getClientId } from "./utils/client-accessor";
import { getClientIndex } from "./utils/tap-client-stack-context";

const isDevelopment =
  typeof process !== "undefined" &&
  (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test");

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

type EventClientRef = { current: AssistantClient | null };
type EventClientInternals = {
  ref: EventClientRef;
  on: AssistantClient["on"];
};

// Keep generation metadata out of the public client object. A retained client
// can follow its committed replacement without exposing internal properties.
const eventClientInternals = new WeakMap<
  AssistantClient,
  EventClientInternals
>();

const getOwnEventClientInternals = (
  client: AssistantClient,
): EventClientInternals | undefined => eventClientInternals.get(client);

const getCurrentEventClient = (client: AssistantClient): AssistantClient =>
  getOwnEventClientInternals(client)?.ref.current ?? client;

const getEventScopeOwner = (
  client: AssistantClient,
  scope: ClientNames,
): AssistantClient | null => {
  let candidate: object | null = client;
  while (candidate && candidate !== Object.prototype) {
    if (Object.prototype.hasOwnProperty.call(candidate, scope)) {
      return candidate as AssistantClient;
    }
    candidate = Object.getPrototypeOf(candidate) as object | null;
  }
  return null;
};

const getEventScopeBinding = (
  subscriber: AssistantClient,
  scope: ClientNames,
): AssistantClientAccessor<ClientNames> | undefined => {
  let client = getCurrentEventClient(subscriber);
  while (true) {
    const owner = getEventScopeOwner(client, scope);
    // Root and hand-built clients may supply accessors dynamically rather than
    // as own properties, so preserve their normal property lookup fallback.
    if (!owner) {
      return client[scope] as AssistantClientAccessor<ClientNames> | undefined;
    }

    const currentOwner = getCurrentEventClient(owner);
    if (currentOwner === owner) {
      return owner[scope] as AssistantClientAccessor<ClientNames>;
    }

    // An inherited scope may belong to an older parent generation. Restart
    // from the parent's committed replacement so retained wrappers follow it.
    client = currentOwner;
  }
};

const createClientObject = (
  parent: AssistantClient,
  fields: ClientFields,
  eventClientRef: EventClientRef,
): AssistantClient => {
  // Swap the sentinel parent for a root prototype to change the error message
  const proto =
    parent === DefaultAssistantClient ? createRootAssistantClient() : parent;

  const client = Object.create(proto) as AssistantClient;
  Object.assign(client, fields);
  eventClientInternals.set(client, {
    ref: eventClientRef,
    on: fields.on,
  });
  return client;
};

function assertEventReceiver(
  receiver: AssistantClient | undefined,
): asserts receiver is AssistantClient {
  if (!receiver) {
    throw new Error(
      "const { on } = useAui() is not supported. Use aui.on() instead.",
    );
  }
}

const assertEventScope = <TEvent extends AssistantEventName>(
  receiver: AssistantClient,
  selector: AssistantEventSelector<TEvent>,
) => {
  const { scope, event } = normalizeEventSelector(selector);
  const binding =
    scope === "*"
      ? undefined
      : getEventScopeBinding(receiver, scope as ClientNames);
  // A hand-built client may route a selector without exposing an accessor,
  // but an explicit unavailable accessor must keep the generated-client error.
  if (binding?.source === null) {
    throw new Error(
      `Scope "${scope}" is not available. Use { scope: "*", event: "${event}" } to listen globally.`,
    );
  }
};

const createEventForwarder = (
  parent: AssistantClient,
): AssistantClient["on"] => {
  const parentOn = parent.on;
  const generatedParent = getOwnEventClientInternals(parent)?.on === parentOn;
  return function <TEvent extends AssistantEventName>(
    this: AssistantClient,
    selector: AssistantEventSelector<TEvent>,
    callback: AssistantEventCallback<TEvent>,
  ) {
    assertEventReceiver(this);
    assertEventScope(this, selector);
    const parentReceiver = generatedParent ? this : parent;
    return parentOn.call(parentReceiver, selector as never, callback as never);
  };
};

const useClientFields = ({
  notifications,
  clientRef,
}: {
  notifications: NotificationManager;
  clientRef: ClientRef;
}): ClientFields => {
  return useMemo(() => {
    const fields: ClientFields = {
      subscribe: notifications.subscribe,
      on: function <TEvent extends AssistantEventName>(
        this: AssistantClient,
        selector: AssistantEventSelector<TEvent>,
        callback: AssistantEventCallback<TEvent>,
      ) {
        assertEventReceiver(this);
        assertEventScope(this, selector);
        const { scope, event } = normalizeEventSelector(selector);

        const localUnsub = notifications.on(event, (payload, clientStack) => {
          if (scope === "*") {
            callback(payload);
            return;
          }

          // Recompute ownership from the subscribing facade's current
          // generation. An inherited scope follows its owning ancestor, while
          // a descendant that adds or rebinds the same name becomes authoritative.
          const boundScope = getEventScopeBinding(this, scope as ClientNames);
          // A scope removed by a structural change since subscription cannot
          // match; resolving its identity would throw
          if (!boundScope || boundScope.source === null) return;
          const scopeClient = getClientId(
            boundScope,
          ) as unknown as ClientMethods;
          const index = getClientIndex(scopeClient);
          if (scopeClient === clientStack[index]) {
            callback(payload);
          }
        });
        const parent = clientRef.parent;
        const parentOn = parent.on;
        const generatedParent =
          getOwnEventClientInternals(parent)?.on === parentOn;
        const currentHost = clientRef.current;
        const boundScope =
          scope === "*"
            ? undefined
            : getEventScopeBinding(this, scope as ClientNames);
        // A root scope emits through this host's notification manager, so
        // forwarding the same registration to generated ancestors is useless.
        if (
          boundScope?.source === "root" &&
          currentHost &&
          Object.prototype.hasOwnProperty.call(currentHost, scope) &&
          currentHost[scope as ClientNames] === boundScope
        ) {
          return localUnsub;
        }
        // A custom parent owns its selector contract. Generated chains keep
        // forwarding because the transport that emits the event may live at a
        // higher ancestor even when that ancestor lacks the subscriber scope.
        if (
          scope !== "*" &&
          !generatedParent &&
          parent[scope as ClientNames]?.source === null
        ) {
          return localUnsub;
        }

        const parentReceiver = generatedParent ? this : parent;
        const parentUnsub = parentOn.call(
          parentReceiver,
          selector as never,
          callback as never,
        );

        return () => {
          localUnsub();
          parentUnsub();
        };
      },
    };
    return fields;
  }, [notifications, clientRef]);
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
}: {
  parent: AssistantClient;
  entries: ScopeEntry[];
  clientRef: ClientRef;
  notifications: NotificationManager;
}): { client: AssistantClient } => {
  const fields = useClientFields({ notifications, clientRef });
  const building = createClientObject(parent, fields, clientRef);

  const accessors = useAssistantTapContextProvider(
    { clientRef, emit: notifications.emit },
    function WithTapContext() {
      return useAssistantContextProvider(
        building,
        function WithBuildingClient() {
          return useScopeMounts(entries);
        },
      );
    },
  );

  const client = useCommittedClient(building, [parent, ...accessors]);

  // Fresh envelope per commit so value-only updates reach the store's
  // subscribers; the client inside keeps its identity
  return {
    client,
  };
};

const useHostedAssistantClient = ({
  parent,
  entries,
}: {
  parent: AssistantClient;
  entries: ScopeEntry[];
}): ScopedAuiClient => {
  const { value: client, effects } = useTapHost(function AssistantClientHost() {
    const clientRef = useRef<ClientRef>({ parent, current: null }).current;
    const notifications = useNotificationManager();

    const store = useTapRoot(function AuiRoot() {
      return useAuiRoot({
        parent,
        entries,
        clientRef,
        notifications,
      });
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

    useEffect(() => {
      clientRef.parent = parent;
      clientRef.current = client;
    });

    if (clientRef.current === null) {
      clientRef.current = client;
    }

    return client;
  });

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
// hook-count change). State notifications stay inherited from the parent,
// while a child-owned event forwarder preserves this facade as the subscriber.
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

  const clientRef = useRef<EventClientRef>({ current: null }).current;
  const fields = useMemo<ClientFields>(
    () => ({
      subscribe: parent.subscribe,
      on: createEventForwarder(parent),
    }),
    [parent],
  );
  const building = createClientObject(parent, fields, clientRef);

  const accessors = entries.map(([name, element]) =>
    // oxlint-disable-next-line react-hooks/rules-of-hooks -- fixed per call site; React throws on a count change
    useDerivedScopeMount(parent, building, name, element),
  );
  const client = useCommittedClient(building, [parent, ...accessors]);

  // Publish structural rebinds during a successful commit, before queued
  // event microtasks can observe them. Render-phase publication would leak an
  // interrupted render into event delivery.
  useInsertionEffect(() => {
    clientRef.current = client;
  }, [client]);
  if (clientRef.current === null) {
    clientRef.current = client;
  }
  return client;
};

type ScopedAuiClient = { client: AssistantClient; effects?: () => void };

// Creates a client extending an explicit parent (which may live in another
// React root) with the scopes in the config; context is never consulted.
// `effects` (rooted mode only) commits the host — the provider mounts it
// ahead of its children's effects; hosts also self-commit as a fallback.
export const useConfiguredAui = (
  parent: AssistantClient,
  clients: AuiConfig.Input,
): ScopedAuiClient => {
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

  if (rooted) {
    // oxlint-disable-next-line react-hooks/rules-of-hooks
    return useHostedAssistantClient({ parent, entries });
  }
  // oxlint-disable-next-line react-hooks/rules-of-hooks
  return { client: useDerivedOnlyClient(parent, entries) };
};

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
    const { client, effects } = useConfiguredAui(parent, clients);
    if (effects) setTapEffects(client, effects);
    return client;
  }
  return parent;
}
