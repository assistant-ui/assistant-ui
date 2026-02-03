"use client";

import { useResource } from "@assistant-ui/tap/react";
import {
  resource,
  tapMemo,
  tapResources,
  tapEffectEvent,
  tapInlineResource,
  tapEffect,
  tapRef,
  tapResource,
  withKey,
  tapSubscribableResource,
} from "@assistant-ui/tap";
import type {
  AssistantClient,
  AssistantClientAccessor,
  ClientNames,
  ClientElement,
  ClientMeta,
} from "./types/client";
import { Derived, DerivedElement } from "./Derived";
import {
  useAssistantContextValue,
  DefaultAssistantClient,
  createRootAssistantClient,
} from "./utils/react-assistant-context";
import {
  DerivedClients,
  RootClients,
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
    const store = tapSubscribableResource(
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
    const notifications = tapInlineResource(NotificationManager());

    tapEffect(
      () => clientRef.parent.subscribe(notifications.notifySubscribers),
      [clientRef, notifications],
    );

    const results = tapResources(
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

type MetaMemo<K extends ClientNames> = {
  meta?: ClientMeta<K>;
  dep?: unknown;
};

const getMeta = <K extends ClientNames>(
  props: Derived.Props<K>,
  clientRef: { parent: AssistantClient; current: AssistantClient | null },
  memo: MetaMemo<K>,
): ClientMeta<K> => {
  if ("source" in props && "query" in props) return props;
  if (memo.dep === props) return memo.meta!;
  const meta = props.getMeta(clientRef.current!);
  memo.meta = meta;
  memo.dep = props;
  return meta;
};

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
    const get = tapEffectEvent(() => element.props);

    return tapMemo(() => {
      const clientFunction = () => get().get(clientRef.current!);
      const metaMemo = {};
      Object.defineProperties(clientFunction, {
        source: {
          get: () => getMeta(get(), clientRef, metaMemo).source,
        },
        query: {
          get: () => getMeta(get(), clientRef, metaMemo).query,
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

const DerivedClientsAccessorsResource = resource(
  ({
    clients,
    clientRef,
  }: {
    clients: DerivedClients;
    clientRef: { parent: AssistantClient; current: AssistantClient | null };
  }) => {
    return tapResources(
      () =>
        Object.keys(clients).map((key) =>
          withKey(
            key,
            DerivedClientAccessorResource({
              element: clients[key as keyof typeof clients]!,
              clientRef,
              name: key as keyof typeof clients,
            }),
          ),
        ),
      [clients, clientRef],
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

    const derivedFields = tapInlineResource(
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

export function useAui(): AssistantClient;
export function useAui(clients: useAui.Props): AssistantClient;
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
