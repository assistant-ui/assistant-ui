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
} from "@assistant-ui/tap";
import type {
  AssistantClient,
  AssistantClientAccessor,
  ClientNames,
  ClientElement,
  ClientMeta,
} from "./types/client";
import { Derived, DerivedElement } from "./Derived";
import { StoreResource } from "./utils/StoreResource";
import {
  useAssistantContextValue,
  DefaultAssistantClient,
  createRootAssistantClient,
} from "./utils/react-assistant-context";
import {
  DerivedClients,
  RootClients,
  splitClients,
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
    return tapMemo(() => ({ methods }), [state]);
  },
);

const RootClientAccessorResource = resource(
  <K extends ClientNames>({
    element,
    notifications,
    clientRef,
  }: {
    element: ClientElement<K>;
    notifications: NotificationManager;
    clientRef: { parent: AssistantClient; current: AssistantClient | null };
  }): AssistantClientAccessor<K> => {
    const store = tapInlineResource(
      StoreResource(
        RootClientResource({ element, emit: notifications.emit, clientRef }),
      ),
    );

    tapEffect(() => {
      return store.subscribe(notifications.notifySubscribers);
    }, [store, notifications]);

    return tapMemo(() => {
      const clientFunction = () => store.getState().methods;
      clientFunction.source = "root" as const;
      clientFunction.query = {};
      return clientFunction;
    }, [store]);
  },
);

const NoOpRootClientsAccessorsResource = resource(() => {
  return tapMemo(
    () => ({ clients: {}, subscribe: undefined, on: undefined }),
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
      inputClients,
      (element) =>
        RootClientAccessorResource({
          element: element!,
          notifications,
          clientRef,
        }),
      [notifications, clientRef],
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
              "const { on } = useAssistantClient() is not supported. Use aui.on() instead.",
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
  }: {
    element: DerivedElement<K>;
    clientRef: { parent: AssistantClient; current: AssistantClient | null };
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
      });
      return clientFunction;
    }, [clientRef]);
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
      clients,
      (element) =>
        DerivedClientAccessorResource({
          element: element!,
          clientRef,
        }),
      [clientRef],
    );
  },
);

/**
 * Resource that creates an extended AssistantClient.
 */
export const AssistantClientResource = resource(
  ({
    baseClient,
    clients,
  }: {
    baseClient: AssistantClient;
    clients: useAssistantClient.Props;
  }): AssistantClient => {
    const { rootClients, derivedClients } = splitClients(clients, baseClient);

    const clientRef = tapRef({
      parent: baseClient,
      current: null as AssistantClient | null,
    }).current;

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
        baseClient === DefaultAssistantClient
          ? createRootAssistantClient()
          : baseClient;
      const client = Object.create(proto) as AssistantClient;
      Object.assign(client, rootFields.clients, derivedFields, {
        subscribe: rootFields.subscribe ?? baseClient.subscribe,
        on: rootFields.on ?? baseClient.on,
        [PROXIED_ASSISTANT_STATE_SYMBOL]: createProxiedAssistantState(client),
      });
      return client;
    }, [baseClient, rootFields, derivedFields]);

    if (clientRef.current === null) {
      clientRef.current = client;
    }

    tapEffect(() => {
      clientRef.current = client;
    });

    return client;
  },
);

export namespace useAssistantClient {
  export type Props = {
    [K in ClientNames]?: ClientElement<K> | DerivedElement<K>;
  };
}

export function useAssistantClient(): AssistantClient;
export function useAssistantClient(
  clients: useAssistantClient.Props,
): AssistantClient;
export function useAssistantClient(
  clients?: useAssistantClient.Props,
): AssistantClient {
  const baseClient = useAssistantContextValue();
  if (clients) {
    return useResource(AssistantClientResource({ baseClient, clients }));
  }
  return baseClient;
}
