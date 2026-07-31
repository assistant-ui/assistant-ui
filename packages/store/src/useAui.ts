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
import { useDerived, type Derived, type DerivedElement } from "./Derived";
import {
  useAssistantContextValue,
  useAssistantContextProvider,
  DefaultAssistantClient,
  createRootAssistantClient,
  setTapEffects,
} from "./utils/react-assistant-context";
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

type ClientRef = { parent: AssistantClient; current: AssistantClient | null };

type ScopeElement = ResourceElement<ClientMethods>;
type ScopeEntry = [name: ClientNames, element: ScopeElement];
type ScopeMeta = {
  source: ClientNames | "root";
  query: Record<string, unknown>;
};
type ScopeAccessor = AssistantClientAccessor<ClientNames>;

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

type ClientFields = {
  subscribe: AssistantClient["subscribe"];
  on: AssistantClient["on"];
};

const createClientObject = (
  parent: AssistantClient,
  fields: ClientFields,
): AssistantClient => {
  // Swap the sentinel parent for a root prototype to change the error message
  const proto =
    parent === DefaultAssistantClient ? createRootAssistantClient() : parent;

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
}): AssistantClient => {
  const { value: client, effects } = useTapHost(function AssistantClientHost() {
    const clientRef = useRef<ClientRef>({ parent, current: null }).current;
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
    // before the notification returns
    useEffect(() => {
      const notify = () => flushTapSync(notifications.notifySubscribers);
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

  setTapEffects(client, effects);

  return client;
};

const useDerivedScopeMount = (
  building: AssistantClient,
  name: ClientNames,
  element: ScopeElement,
): ScopeAccessor => {
  const value = useDerived(element.args[0] as Derived.Props<ClientNames>);

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
// hook-count change). subscribe/on delegate wholesale to the parent, so
// emissions and state updates flow through the parent's machinery.
const useDerivedOnlyClient = (
  parent: AssistantClient,
  entries: ScopeEntry[],
): AssistantClient => {
  if (isDevelopment) {
    const root = entries.find(([, element]) => !isDerivedElement(element));
    if (root) {
      throw new Error(
        `Scope "${root[0]}" is a root scope but this useAui mounted derived-only; ` +
          "remount with a new key to change scope kinds.",
      );
    }
  }

  const building = createClientObject(parent, {
    subscribe: parent.subscribe,
    on: parent.on,
  });

  const accessors = entries.map(([name, element]) =>
    // oxlint-disable-next-line react-hooks/rules-of-hooks -- fixed per call site; React throws on a count change
    useDerivedScopeMount(building, name, element),
  );
  return useCommittedClient(building, [parent, ...accessors]);
};

const useScopedClient = (
  parent: AssistantClient,
  clients: useAui.Props,
): AssistantClient => {
  const entries = Object.entries(
    applyTransformScopes(clients, parent),
  ) as ScopeEntry[];

  // The mode is frozen at mount; both branches handle dynamic scope sets of
  // their own kind, only a scope-kind change requires a remount
  const [rooted] = useState(() =>
    entries.some(([, element]) => !isDerivedElement(element)),
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
