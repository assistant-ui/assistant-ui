"use client";

import { useMemo } from "react";
import { useResource } from "@assistant-ui/tap/react";
import {
  resource,
  tapMemo,
  tapResources,
  tapEffectEvent,
  tapInlineResource,
  tapEffect,
} from "@assistant-ui/tap";
import type {
  AssistantClient,
  AssistantClientAccessor,
  ClientNames,
  ClientElement,
} from "./types/client";
import { DerivedElement } from "./Derived";
import { StoreResource } from "./utils/StoreResource";
import {
  useAssistantContextValue,
  OuterClient,
  InnerClient,
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
import { EventManager } from "./utils/EventManager";
import { withAssistantTapContextProvider } from "./utils/tap-assistant-context";
import { ClientResource } from "./utils/ClientResource";
import { getClientIndex } from "./utils/tap-client-stack-context";

const RootClientResource = resource(
  <K extends ClientNames>({
    element,
    events,
    client,
  }: {
    element: ClientElement<K>;
    events: EventManager;
    client: AssistantClient;
  }) => {
    return withAssistantTapContextProvider({ client, events }, () =>
      tapInlineResource(ClientResource(element)),
    );
  },
);

const RootClientAccessorResource = resource(
  <K extends ClientNames>({
    element,
    events,
    client,
    notifySubscribers,
  }: {
    element: ClientElement<K>;
    events: EventManager;
    client: AssistantClient;
    notifySubscribers: () => void;
  }): AssistantClientAccessor<K> => {
    const store = tapInlineResource(
      StoreResource(RootClientResource({ element, events, client })),
    );

    tapEffect(() => {
      return store.subscribe(notifySubscribers);
    }, [store, events]);

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

const RootClientAcessorsResource = resource(
  ({
    clients: inputClients,
    client,
  }: {
    clients: RootClients;
    client: AssistantClient;
  }) => {
    const { subscribe, notifySubscribers, events } = tapInlineResource(
      EventManager(),
    );

    tapEffect(
      () => client.subscribe(notifySubscribers),
      [client, notifySubscribers],
    );

    const results = tapResources(
      inputClients,
      (element) =>
        RootClientAccessorResource({
          element: element!,
          events,
          client,
          notifySubscribers,
        }),
      [events, client, notifySubscribers],
    );

    return tapMemo(() => {
      return {
        clients: results,
        subscribe,
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

          const localUnsub = events.on(event, (payload, clientStack) => {
            if (scope === "*") {
              callback(payload);
              return;
            }

            const scopeClient = this[scope as ClientNames]?.();
            if (!scopeClient) return;

            const index = getClientIndex(scopeClient);
            if (scopeClient === clientStack[index]) {
              callback(payload);
            }
          });

          const parentUnsub = client.on(selector, callback);

          return () => {
            localUnsub();
            parentUnsub();
          };
        },
      };
    }, [results, events, client]);
  },
);

export const useRootClients = (
  clients: RootClients,
  client: AssistantClient,
) => {
  return useResource(
    Object.keys(clients).length > 0
      ? RootClientAcessorsResource({ clients, client })
      : NoOpRootClientsAccessorsResource(),
  );
};

const DerivedClientAcessorResource = resource(
  <K extends ClientNames>({
    element,
    client,
  }: {
    element: DerivedElement<K>;
    client: AssistantClient;
  }) => {
    const get = tapEffectEvent(element.props.get);
    const { source, query } = element.props;

    return tapMemo(() => {
      const clientFunction = () => get(client);
      clientFunction.source = source;
      clientFunction.query = query;
      return clientFunction;
    }, [get, source, JSON.stringify(query), client]);
  },
);

const DerivedClientAccessorssResource = resource(
  ({
    clients,
    client,
  }: {
    clients: DerivedClients;
    client: AssistantClient;
  }) => {
    return tapResources(
      clients,
      (element) =>
        DerivedClientAcessorResource({
          element: element!,
          client,
        }),
      [client],
    );
  },
);

export const useDerivedClients = (
  derivedClients: DerivedClients,
  client: AssistantClient,
) => {
  return useResource(
    DerivedClientAccessorssResource({ clients: derivedClients, client }),
  );
};

const useExtendedAssistantClientImpl = (
  clients: useAssistantClient.Props,
): AssistantClient => {
  const baseClient = useAssistantContextValue();
  const { rootClients, derivedClients } = splitClients(clients);

  const rootFields = useRootClients(rootClients, baseClient);
  const derivedFields = useDerivedClients(derivedClients, baseClient);

  return useMemo(() => {
    // Swap OuterClient -> InnerClient at root to change error message
    const proto = baseClient === OuterClient ? InnerClient : baseClient;
    const client = Object.create(proto) as AssistantClient;
    Object.assign(client, rootFields.clients, derivedFields, {
      subscribe: rootFields.subscribe ?? baseClient.subscribe,
      on: rootFields.on ?? baseClient.on,
    });
    return client;
  }, [baseClient, rootFields, derivedFields]);
};

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
  if (clients) {
    return useExtendedAssistantClientImpl(clients);
  }
  return useAssistantContextValue();
}
