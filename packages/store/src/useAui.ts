"use client";

import { useResource } from "@assistant-ui/tap/react";
import {
  resource,
  tapMemo,
  tapResources,
  tapEffect,
  tapRef,
  tapResource,
  withKey,
  tapResourceRoot,
} from "@assistant-ui/tap";
import type {
  AssistantClient,
  AssistantClientAccessor,
  ClientNames,
  ClientElement,
  ClientMeta,
} from "./types/client";
import type { DerivedElement } from "./Derived";
import {
  useAssistantContextValue,
  DefaultAssistantClient,
  createRootAssistantClient,
} from "./utils/react-assistant-context";
import {
  type DerivedClients,
  type RootClients,
  tapSplitClients,
} from "./utils/splitClients";
import {
  normalizeEventSelector,
  type AssistantEventName,
  type AssistantEventCallback,
  type AssistantEventSelector,
} from "./types/events";
import { NotificationManager } from "./utils/NotificationManager";
import { withAssistantTapContextProvider } from "./utils/tap-assistant-context";
import { tapClientResource } from "./tapClientResource";
import { getClientIndex } from "./utils/tap-client-stack-context";
import {
  PROXIED_ASSISTANT_STATE_SYMBOL,
  createProxiedAssistantState,
} from "./utils/proxied-assistant-state";

const tapShallowMemoArray = <T>(array: readonly T[]) => {
  // biome-ignore lint/correctness/useExhaustiveDependencies: shallow memo
  return tapMemo(() => array, array);
};

const RootClientResource = resource(
  <K extends ClientNames>({
    element,
    emit,
    clientRef,
  }: {
    element: ClientElement<K>;
    emit: NotificationManager["emit"];
    clientRef: { parent: AssistantClient; current: AssistantClient | null };
  }) => {
    const { methods, state } = withAssistantTapContextProvider(
      { clientRef, emit },
      () => tapClientResource(element),
    );
    return tapMemo(() => ({ state, methods }), [methods, state]);
  },
);

const RootClientAccessorResource = resource(
  <K extends ClientNames>({
    element,
    notifications,
    clientRef,
    name,
  }: {
    element: ClientElement<K>;
    notifications: NotificationManager;
    clientRef: { parent: AssistantClient; current: AssistantClient | null };
    name: K;
  }): AssistantClientAccessor<K> => {
    const store = tapResourceRoot(
      RootClientResource({ element, emit: notifications.emit, clientRef }),
    );

    tapEffect(() => {
      return store.subscribe(notifications.notifySubscribers);
    }, [store, notifications]);

    return tapMemo(() => {
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
  },
);

const NoOpRootClientsAccessorsResource = resource(() => {
  return tapMemo(
    () => ({
      clients: [] as AssistantClientAccessor<ClientNames>[],
      subscribe: undefined,
      on: undefined,
    }),
    [],
  );
});

const RootClientsAccessorsResource = resource(
  ({
    clients: inputClients,
    clientRef,
  }: {
    clients: RootClients;
    clientRef: { parent: AssistantClient; current: AssistantClient | null };
  }) => {
    const notifications = tapResource(NotificationManager());

    tapEffect(
      () => clientRef.parent.subscribe(notifications.notifySubscribers),
      [clientRef, notifications],
    );

    const results = tapShallowMemoArray(
      tapResources(
        () =>
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
        [inputClients, notifications, clientRef],
      ),
    );

    return tapMemo(() => {
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
  },
);

const DerivedClientAccessorResource = resource(
  <K extends ClientNames>({
    element,
    clientRef,
    name,
  }: {
    element: DerivedElement<K>;
    clientRef: { parent: AssistantClient; current: AssistantClient | null };
    name: K;
  }) => {
    // Track the latest props on a ref updated in render. The fiber is
    // keyed on the scope's meta by DerivedClientsAccessorsResource, so
    // source/query are stable for this fiber's lifetime and the only
    // value that can change between renders for the same fiber is the
    // identity of the `get` closure. Routing reads through the ref
    // avoids the one-commit lag that the previous `tapEffectEvent`
    // path imposed.
    const propsRef = tapRef(element.props);
    propsRef.current = element.props;

    return tapMemo(() => {
      const clientFunction = () =>
        propsRef.current.get(clientRef.current!);
      Object.defineProperties(clientFunction, {
        source: {
          value: element.props.source,
        },
        query: {
          value: element.props.query,
        },
        name: {
          value: name,
          configurable: true,
        },
      });
      return clientFunction as AssistantClientAccessor<K>;
    }, [clientRef, name]);
  },
);

const serializeMeta = <K extends ClientNames>(
  name: K,
  meta: ClientMeta<K>,
): string => `${name}::${meta.source}::${JSON.stringify(meta.query)}`;

const DerivedClientsAccessorsResource = resource(
  ({
    clients,
    clientRef,
  }: {
    clients: DerivedClients;
    clientRef: { parent: AssistantClient; current: AssistantClient | null };
  }) => {
    return tapShallowMemoArray(
      tapResources(
        () =>
          Object.keys(clients).map((key) => {
            const name = key as keyof typeof clients;
            const element = clients[name]!;
            return withKey(
              serializeMeta(name, element.props),
              DerivedClientAccessorResource({
                element,
                clientRef,
                name,
              }),
            );
          }),
        [clients, clientRef],
      ),
    );
  },
);

/**
 * Resource that creates an extended AssistantClient.
 */
export const AssistantClientResource = resource(
  ({
    parent,
    clients,
  }: {
    parent: AssistantClient;
    clients: useAui.Props;
  }): AssistantClient => {
    const { rootClients, derivedClients } = tapSplitClients(clients, parent);

    const clientRef = tapRef({
      parent: parent,
      current: null as AssistantClient | null,
    }).current;

    tapEffect(() => {
      // if (clientRef.current && clientRef.current !== client)
      //   throw new Error("clientRef.current !== client");

      clientRef.current = client;
    });

    const rootFields = tapResource(
      Object.keys(rootClients).length > 0
        ? RootClientsAccessorsResource({ clients: rootClients, clientRef })
        : NoOpRootClientsAccessorsResource(),
    );

    const derivedFields = tapResource(
      DerivedClientsAccessorsResource({ clients: derivedClients, clientRef }),
    );

    const client = tapMemo(() => {
      // Swap DefaultAssistantClient -> createRootAssistantClient at root to change error message
      const proto =
        parent === DefaultAssistantClient
          ? createRootAssistantClient()
          : parent;

      const client = Object.create(proto) as AssistantClient;
      Object.assign(client, {
        subscribe: rootFields.subscribe ?? parent.subscribe,
        on: rootFields.on ?? parent.on,
        [PROXIED_ASSISTANT_STATE_SYMBOL]: createProxiedAssistantState(client),
      });

      for (const field of rootFields.clients) {
        (client as any)[field.name] = field;
      }
      for (const field of derivedFields) {
        (client as any)[field.name] = field;
      }

      return client;
    }, [parent, rootFields, derivedFields]);

    if (clientRef.current === null) {
      clientRef.current = client;
    }

    return client;
  },
);

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
    // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
    return useResource(
      AssistantClientResource({
        parent: parent ?? DefaultAssistantClient,
        clients,
      }),
    );
  }
  if (parent === null)
    throw new Error("received null parent, this usage is not allowed");
  return parent;
}
