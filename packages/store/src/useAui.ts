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
type ScopeEntry = { name: ClientNames; element: ScopeElement };
type ScopeMeta = {
  source: ClientNames | "root";
  query: Record<string, unknown>;
};
type ScopeResult = {
  name: ClientNames;
  accessor: AssistantClientAccessor<ClientNames>;
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

const useScopeResult = (
  name: ClientNames,
  accessor: AssistantClientAccessor<ClientNames>,
): ScopeResult => useMemo(() => ({ name, accessor }), [name, accessor]);

const useRootScopeMount = ({ name, element }: ScopeEntry): ScopeResult => {
  const { methods } = useResource(ClientResource(element));

  const meta = useScopeMeta(element);
  const accessor = useMemo(
    () => createAccessor(name, meta, () => methods),
    [name, meta, methods],
  );

  return useScopeResult(name, accessor);
};

const RootScopeMount = resource(useRootScopeMount);

const useRootScopeMounts = (entries: ScopeEntry[]): ScopeResult[] =>
  useResources(
    entries.map((entry) => withKey(entry.name, RootScopeMount(entry))),
  );

// A Derived scope runs under React's dispatcher in both modes: a
// useSyncExternalStore against the building client, exactly like the former
// tap-mounted useDerived. Mirroring tap's useSyncExternalStore, a throwing
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

  const meta = useScopeMeta(element);
  const accessor = useMemo(
    () => createAccessor(name, meta, () => value),
    [name, meta, value],
  );

  return useScopeResult(name, accessor);
};

const useCommittedClient = ({
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
  const fields = useMemo(
    () => ({ subscribe: parent.subscribe, on: parent.on }),
    [parent],
  );
  const building = createClientObject(parent, fields);

  const results = entries.map((entry) =>
    // oxlint-disable-next-line react-hooks/rules-of-hooks -- scope kinds are static per call site (dev invariant in useAssistantClient)
    useDerivedScope(building, entry),
  );

  return useCommittedClient({ parent, fields, results });
};

const useRootedClient = (
  parent: AssistantClient,
  entries: ScopeEntry[],
): AssistantClient => {
  const clientRef = useRef<ClientRef>({ parent, current: null }).current;
  const latest = useRef({
    parent,
    client: null as AssistantClient | null,
  }).current;
  const notifications = useNotificationManager();
  const fields = useClientFields({ notifications, clientRef });
  const building = createClientObject(parent, fields);
  const ctx = useMemo(
    () => ({ clientRef, emit: notifications.emit }),
    [clientRef, notifications],
  );

  const rootEntries = entries.filter(
    (entry) => !isDerivedElement(entry.element),
  );

  const { value: rootResults, effects } = useTapHost(
    function AssistantClientHost() {
      const store = useTapRoot(function AuiRoot() {
        return useAssistantTapContextProvider(ctx, function WithTapContext() {
          // Fresh envelope per commit so value-only updates reach the store's
          // subscribers; the results array inside keeps its identity
          return { results: useShallowStable(useRootScopeMounts(rootEntries)) };
        });
      });

      const results = useSyncExternalStore(
        store.subscribe,
        () => store.getValue().results,
        () => store.getValue().results,
      );

      // flushTapSync makes structural rebinds triggered by a notification land
      // before the notification returns
      useEffect(
        () =>
          store.subscribe(() => flushTapSync(notifications.notifySubscribers)),
        // oxlint-disable-next-line react-hooks/exhaustive-deps
        [store, notifications],
      );
      useEffect(
        () =>
          parent.subscribe(() => flushTapSync(notifications.notifySubscribers)),
        // oxlint-disable-next-line react-hooks/exhaustive-deps
        [parent, notifications],
      );
      useEffect(() => {
        clientRef.parent = latest.parent;
        clientRef.current = latest.client;
      });

      return results;
    },
  );

  const rootByName = new Map(rootResults.map((r) => [r.name, r]));
  for (const { name, accessor } of rootResults) {
    (building as Record<ClientNames, unknown>)[name] = accessor;
  }

  const results = entries
    .map((entry) => {
      if (!isDerivedElement(entry.element)) return rootByName.get(entry.name);
      // oxlint-disable-next-line react-hooks/rules-of-hooks -- scope kinds are static per call site (dev invariant in useAssistantClient)
      const result = useDerivedScope(building, entry);
      // Later derived siblings resolve through the building client
      (building as Record<ClientNames, unknown>)[entry.name] = result.accessor;
      return result;
    })
    .filter((result) => result !== undefined);

  const client = useCommittedClient({ parent, fields, results });
  (client as Record<symbol, unknown>)[AUI_USE_EFFECTS_SYMBOL] = effects;

  latest.parent = parent;
  latest.client = client;
  if (clientRef.current === null) {
    clientRef.current = client;
  }

  return client;
};

const scopeSignature = (derivedOnly: boolean, entries: ScopeEntry[]) =>
  `${derivedOnly ? "derived-only" : "rooted"}|${entries
    .filter((entry) => isDerivedElement(entry.element))
    .map((entry) => entry.name)
    .join(",")}`;

const useAssistantClient = ({
  parent,
  clients,
}: {
  parent: AssistantClient;
  clients: useAui.Props;
}): AssistantClient => {
  const entries = toScopeEntries(applyTransformScopes(clients, parent));
  const derivedOnly = entries.every((entry) => isDerivedElement(entry.element));

  const signature = scopeSignature(derivedOnly, entries);
  const committedSignature = useRef(signature).current;
  if (isDevelopment && committedSignature !== signature) {
    throw new Error(
      `useAui scope kinds changed between renders (previous: "${committedSignature}", next: "${signature}"). ` +
        "The mode (derived-only vs rooted) and the set of Derived scopes must be static for a component.",
    );
  }

  // Mode selection branches the hook path; the dev invariant above guards it
  if (derivedOnly) {
    // oxlint-disable-next-line react-hooks/rules-of-hooks
    return useDerivedOnlyClient(parent, entries);
  }
  // oxlint-disable-next-line react-hooks/rules-of-hooks
  return useRootedClient(parent, entries);
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
    return useAssistantClient({ parent, clients });
  }
  return parent;
}
