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
import { useMemo, useEffect, useRef, useSyncExternalStore } from "react";

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

type ClientRef = { parent: AssistantClient; current: AssistantClient | null };

type ScopeElement = ResourceElement<ClientMethods>;
type ScopeEntry = { name: ClientNames; element: ScopeElement };
type ScopeMeta = {
  source: ClientNames | "root";
  query: Record<string, unknown>;
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

const derivedPropsOf = (element: ScopeElement) =>
  element.args[0] as Derived.Props<ClientNames> & {
    query?: Record<string, unknown>;
  };

const ROOT_META: ScopeMeta = { source: "root", query: {} };

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

const useScopeValue = (element: ScopeElement) =>
  useResource(ClientResource(element));

const useScopeMount = ({
  name,
  element,
}: ScopeEntry): AssistantClientAccessor<ClientNames> => {
  const client = useBuildingClient();
  const { methods } = useScopeValue(element);

  const accessor = useMemo(
    () => createAccessor(name, ROOT_META, () => methods),
    [name, methods],
  );

  // Only fill vacant slots so a re-render never mutates an already-built client
  if (!Object.hasOwn(client, name)) {
    (client as Record<ClientNames, unknown>)[name] = accessor;
  }

  return accessor;
};

const ScopeMount = resource(useScopeMount);

const useScopeMounts = (
  entries: ScopeEntry[],
): AssistantClientAccessor<ClientNames>[] =>
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

const useDerivedMount = ({
  name,
  element,
}: ScopeEntry): AssistantClientAccessor<ClientNames> => {
  const client = useBuildingClient();
  const { source, query = {} } = derivedPropsOf(element);
  const instance = useDerived(derivedPropsOf(element)) as ClientMethods;

  const meta = useShallowStable({ source, query: useShallowStable(query) });
  const accessor = useMemo(
    () => createAccessor(name, meta, () => instance),
    [name, meta, instance],
  );

  // Only fill vacant slots so a re-render never mutates an already-built client
  if (!Object.hasOwn(client, name)) {
    (client as Record<ClientNames, unknown>)[name] = accessor;
  }

  return accessor;
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

  const entries = toScopeEntries(applyTransformScopes(clients, parent));
  const buildEntries = entries.filter((e) => !isDerivedElement(e.element));
  const derivedEntries = entries.filter((e) => isDerivedElement(e.element));

  const fields = useClientFields({ notifications, clientRef });
  const building = createClientObject(parent, fields);

  const store = useTapRoot(function AuiRoot() {
    const results = useAssistantTapContextProvider(
      { clientRef, emit: notifications.emit },
      function WithTapContext() {
        return useBuildingClientProvider(
          building,
          function WithBuildingClient() {
            return useScopeMounts(buildEntries);
          },
        );
      },
    );
    // Fresh envelope per render so value-only updates reach the store's
    // subscribers; the accessors inside keep their identity
    return { accessors: useShallowStable(results) };
  });

  const readBuildAccessors = () => store.getValue().accessors;
  const buildAccessors = useSyncExternalStore(
    store.subscribe,
    readBuildAccessors,
    readBuildAccessors,
  );

  const derivedAccessors = useBuildingClientProvider(
    building,
    function WithBuildingClient() {
      // oxlint-disable-next-line react-hooks/rules-of-hooks -- scope maps are static per call site
      return derivedEntries.map((entry) => useDerivedMount(entry));
    },
  );

  let buildIndex = 0;
  let derivedIndex = 0;
  const accessors = useShallowStable(
    entries.map(({ element }) =>
      isDerivedElement(element)
        ? derivedAccessors[derivedIndex++]!
        : buildAccessors[buildIndex++]!,
    ),
  );

  const client = useCommittedClient({ building, parent, fields, accessors });

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
export function useAui(clients?: useAui.Props): AssistantClient {
  const parent = useAssistantContextValue();
  if (clients) {
    return useHostedAssistantClient({ parent, clients });
  }
  return parent;
}
