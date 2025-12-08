"use client";

import { useMemo } from "react";
import { useResource } from "@assistant-ui/tap/react";
import {
  resource,
  tapMemo,
  tapResources,
  tapEffectEvent,
  tapInlineResource,
  ResourceElement,
  tapEffect,
} from "@assistant-ui/tap";
import type {
  AssistantClient,
  ClientSchemas,
  ClientResourceElements,
  ClientAccessor,
  ClientResourceElement,
  DerivedClientProps,
} from "./types";
import { StoreResource } from "./utils/StoreResource";
import { useAssistantContextValue } from "./AssistantContext";
import { splitClients } from "./utils/splitClients";
import {
  EventManager,
  normalizeEventSelector,
  type AssistantEvent,
  type AssistantEventCallback,
  type AssistantEventSelector,
} from "./EventContext";
import { withAssistantTapContextProvider } from "./AssistantTapContext";
import { tapClientResource } from "./tapClientResource";
import { getClientIndex } from "./ClientStackContext";

const RootClientStoreResource = resource(
  <K extends keyof ClientSchemas>({
    element,
    events,
    client,
  }: {
    element: ClientResourceElement<ClientSchemas[K]>;
    events: EventManager;
    client: AssistantClient;
  }) => {
    return withAssistantTapContextProvider({ client, events }, () =>
      tapClientResource(element),
    );
  },
);

const RootClientResource = resource(
  <K extends keyof ClientSchemas>({
    element,
    events,
    client,
    notifySubscribers,
  }: {
    element: ClientResourceElement<ClientSchemas[K]>;
    events: EventManager;
    client: AssistantClient;
    notifySubscribers: () => void;
  }): ClientAccessor<ClientSchemas[K]> => {
    const store = tapInlineResource(
      StoreResource(RootClientStoreResource({ element, events, client })),
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

const NoOpRootClientsResource = resource(() => {
  return tapMemo(
    () => ({ clients: {}, subscribe: undefined, on: undefined }),
    [],
  );
});

const RootClientsResource = resource(
  ({
    clients: inputClients,
    client,
  }: {
    clients: ClientResourceElements;
    client: AssistantClient;
  }) => {
    const { subscribe, notifySubscribers, events } = tapInlineResource(
      EventManager(),
    );

    tapEffect(
      () => client.subscribe(notifySubscribers),
      [client, notifySubscribers],
    );

    const results = tapResources(inputClients, (element) =>
      RootClientResource({
        element: element!,
        events,
        client,
        notifySubscribers,
      }),
    );

    return tapMemo(() => {
      return {
        clients: results,
        subscribe,
        on: function <TEvent extends AssistantEvent>(
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

            const scopeClient = this[scope as keyof ClientSchemas]?.();
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

export const useRootClients = (clients: ClientResourceElements, client: AssistantClient) => {
  return useResource(
    Object.keys(clients).length > 0
      ? RootClientsResource({ clients, client })
      : NoOpRootClientsResource(),
  );
};

const DerivedClientResource = resource(
  <K extends keyof ClientSchemas>({
    element,
    client,
  }: {
    element: ResourceElement<
      ClientSchemas[K],
      DerivedClientProps<ClientSchemas[K]>
    >;
    client: AssistantClient;
  }) => {
    const get = tapEffectEvent(element.props.get);
    const { source, query } = element.props;

    return tapMemo(() => {
      const clientFunction = () => get(client);
      clientFunction.source = source;
      clientFunction.query = query;
      return clientFunction as ClientAccessor<ClientSchemas[K]>;
    }, [get, source, JSON.stringify(query), client]);
  },
);

const DerivedClientsResource = resource(
  ({ clients, client }: { clients: ClientResourceElements; client: AssistantClient }) => {
    return tapResources(
      clients,
      (element) => DerivedClientResource({ element: element!, client }),
      [],
    );
  },
);

export const useDerivedClients = (
  derivedClients: ClientResourceElements,
  client: AssistantClient,
) => {
  return useResource(DerivedClientsResource({ clients: derivedClients, client }));
};

const useExtendedAssistantClientImpl = (
  clients: ClientResourceElements,
): AssistantClient => {
  const baseClient = useAssistantContextValue();
  const { rootClients, derivedClients } = splitClients(clients);

  const rootFields = useRootClients(rootClients, baseClient);
  const derivedFields = useDerivedClients(derivedClients, baseClient);

  return useMemo(
    () =>
      ({
        ...baseClient,
        ...rootFields.clients,
        ...derivedFields,
        subscribe: rootFields.subscribe ?? baseClient.subscribe,
        on: rootFields.on ?? baseClient.on,
      }) as AssistantClient,
    [baseClient, rootFields, derivedFields],
  );
};

export function useAssistantClient(): AssistantClient;
export function useAssistantClient(clients: ClientResourceElements): AssistantClient;
export function useAssistantClient(clients?: ClientResourceElements): AssistantClient {
  if (clients) {
    return useExtendedAssistantClientImpl(clients);
  }
  return useAssistantContextValue();
}
