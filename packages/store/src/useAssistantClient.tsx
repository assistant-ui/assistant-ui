"use client";

import { useEffect, useMemo, useRef } from "react";
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
  AssistantState,
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
import { ClientResource, getClientState } from "./utils/ClientResource";
import { getClientIndex } from "./utils/tap-client-stack-context";

const RootClientResource = resource(
  <K extends ClientNames>({
    element,
    events,
    clientRef,
  }: {
    element: ClientElement<K>;
    events: EventManager;
    clientRef: { parent: AssistantClient; current: AssistantClient | null };
  }) => {
    const methods = withAssistantTapContextProvider({ clientRef, events }, () =>
      tapInlineResource(ClientResource(element)),
    );
    return tapMemo(() => ({ methods }), [getClientState(methods)]);
  },
);

const RootClientAccessorResource = resource(
  <K extends ClientNames>({
    element,
    events,
    clientRef,
    notifySubscribers,
  }: {
    element: ClientElement<K>;
    events: EventManager;
    clientRef: { parent: AssistantClient; current: AssistantClient | null };
    notifySubscribers: () => void;
  }): AssistantClientAccessor<K> => {
    const store = tapInlineResource(
      StoreResource(RootClientResource({ element, events, clientRef })),
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
    clientRef,
  }: {
    clients: RootClients;
    clientRef: { parent: AssistantClient; current: AssistantClient | null };
  }) => {
    const { subscribe, notifySubscribers, events } = tapInlineResource(
      EventManager(),
    );

    tapEffect(
      () => clientRef.parent.subscribe(notifySubscribers),
      [clientRef, notifySubscribers],
    );

    const results = tapResources(
      inputClients,
      (element) =>
        RootClientAccessorResource({
          element: element!,
          events,
          clientRef,
          notifySubscribers,
        }),
      [events, clientRef, notifySubscribers],
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

          const parentUnsub = clientRef.parent.on(selector, callback);

          return () => {
            localUnsub();
            parentUnsub();
          };
        },
      };
    }, [results, events, clientRef]);
  },
);

export const useRootClients = (
  clients: RootClients,
  clientRef: { parent: AssistantClient; current: AssistantClient | null },
) => {
  return useResource(
    Object.keys(clients).length > 0
      ? RootClientAcessorsResource({ clients, clientRef })
      : NoOpRootClientsAccessorsResource(),
  );
};

const DerivedClientAcessorResource = resource(
  <K extends ClientNames>({
    element,
    clientRef,
  }: {
    element: DerivedElement<K>;
    clientRef: { parent: AssistantClient; current: AssistantClient | null };
  }) => {
    const get = tapEffectEvent(element.props.get);
    const { source, query } = element.props;

    return tapMemo(() => {
      const clientFunction = () => get(clientRef.current!);
      clientFunction.source = source;
      clientFunction.query = query;
      return clientFunction;
    }, [get, source, JSON.stringify(query), clientRef]);
  },
);

const DerivedClientAccessorssResource = resource(
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
        DerivedClientAcessorResource({
          element: element!,
          clientRef,
        }),
      [clientRef],
    );
  },
);

export const useDerivedClients = (
  derivedClients: DerivedClients,
  clientRef: { parent: AssistantClient; current: AssistantClient | null },
) => {
  return useResource(
    DerivedClientAccessorssResource({ clients: derivedClients, clientRef }),
  );
};

export const PROXIED_ASSISTANT_STATE_SYMBOL = Symbol(
  "assistant-ui.store.proxiedAssistantState",
);

/**
 * Proxied state that lazily accesses scope states
 */
export const createProxiedAssistantState = (
  client: AssistantClient,
): AssistantState => {
  return new Proxy({} as AssistantState, {
    get(_, prop) {
      const scope = prop as keyof AssistantClient;
      if (scope === "on") return undefined;
      if (scope === "subscribe") return undefined;

      const scopeField = client[scope]();
      return getClientState(scopeField);
    },
  });
};

export const getProxiedAssistantState = (
  client: AssistantClient,
): AssistantState => {
  return (
    client as unknown as { [PROXIED_ASSISTANT_STATE_SYMBOL]: AssistantState }
  )[PROXIED_ASSISTANT_STATE_SYMBOL];
};

const useExtendedAssistantClientImpl = (
  clients: useAssistantClient.Props,
): AssistantClient => {
  const baseClient = useAssistantContextValue();
  const { rootClients, derivedClients } = splitClients(clients);

  const clientRef = useRef({
    parent: baseClient,
    current: null as AssistantClient | null,
  }).current;
  const rootFields = useRootClients(rootClients, clientRef);
  const derivedFields = useDerivedClients(derivedClients, clientRef);

  const client = useMemo(() => {
    // Swap OuterClient -> InnerClient at root to change error message
    const proto = baseClient === OuterClient ? InnerClient : baseClient;
    const client = Object.create(proto) as AssistantClient;
    Object.assign(client, rootFields.clients, derivedFields, {
      subscribe: rootFields.subscribe ?? baseClient.subscribe,
      on: rootFields.on ?? baseClient.on,
      [PROXIED_ASSISTANT_STATE_SYMBOL]: createProxiedAssistantState(client),
    });
    return client;
  }, [baseClient, rootFields, derivedFields]);

  if (clientRef.current === baseClient) {
    clientRef.current = client;
  }
  useEffect(() => {
    clientRef.current = client;
  });

  return client;
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
