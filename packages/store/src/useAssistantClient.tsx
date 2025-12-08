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
  AssistantScopes,
  ScopesInput,
  ScopeField,
  ScopeInput,
  DerivedScopeProps,
} from "./types";
import { StoreResource } from "./utils/StoreResource";
import { useAssistantContextValue } from "./AssistantContext";
import { splitScopes } from "./utils/splitScopes";
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

const RootScopeStoreResource = resource(
  <K extends keyof AssistantScopes>({
    element,
    events,
    client,
  }: {
    element: ScopeInput<AssistantScopes[K]>;
    events: EventManager;
    client: AssistantClient;
  }) => {
    return withAssistantTapContextProvider({ client, events }, () =>
      tapClientResource(element),
    );
  },
);

const RootScopeResource = resource(
  <K extends keyof AssistantScopes>({
    element,
    events,
    client,
    notifySubscribers,
  }: {
    element: ScopeInput<AssistantScopes[K]>;
    events: EventManager;
    client: AssistantClient;
    notifySubscribers: () => void;
  }): ScopeField<AssistantScopes[K]> => {
    const store = tapInlineResource(
      StoreResource(RootScopeStoreResource({ element, events, client })),
    );

    tapEffect(() => {
      return store.subscribe(notifySubscribers);
    }, [store, events]);

    return tapMemo(() => {
      const scopeFunction = () => store.getState().client;
      scopeFunction.source = "root" as const;
      scopeFunction.query = {};
      return scopeFunction;
    }, [store]);
  },
);

const NoOpRootScopeResource = resource(() => {
  return tapMemo(
    () => ({ scopes: {}, subscribe: undefined, on: undefined }),
    [],
  );
});

const RootScopesResource = resource(
  ({
    scopes: inputScopes,
    client,
  }: {
    scopes: ScopesInput;
    client: AssistantClient;
  }) => {
    const { subscribe, notifySubscribers, events } = tapInlineResource(
      EventManager(),
    );

    tapEffect(
      () => client.subscribe(notifySubscribers),
      [client, notifySubscribers],
    );

    const results = tapResources(inputScopes, (element) =>
      RootScopeResource({
        element: element!,
        events,
        client,
        notifySubscribers,
      }),
    );

    return tapMemo(() => {
      return {
        scopes: results,
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

            const scopeClient = this[scope as keyof AssistantScopes]?.();
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

export const useRootScopes = (scopes: ScopesInput, client: AssistantClient) => {
  return useResource(
    Object.keys(scopes).length > 0
      ? RootScopesResource({ scopes, client })
      : NoOpRootScopeResource(),
  );
};

const DerivedScopeResource = resource(
  <K extends keyof AssistantScopes>({
    element,
    client,
  }: {
    element: ResourceElement<
      AssistantScopes[K],
      DerivedScopeProps<AssistantScopes[K]>
    >;
    client: AssistantClient;
  }) => {
    const get = tapEffectEvent(element.props.get);
    const { source, query } = element.props;

    return tapMemo(() => {
      const scopeFunction = () => get(client);
      scopeFunction.source = source;
      scopeFunction.query = query;
      return scopeFunction as ScopeField<AssistantScopes[K]>;
    }, [get, source, JSON.stringify(query), client]);
  },
);

const DerivedScopesResource = resource(
  ({ scopes, client }: { scopes: ScopesInput; client: AssistantClient }) => {
    return tapResources(
      scopes,
      (element) => DerivedScopeResource({ element: element!, client }),
      [],
    );
  },
);

export const useDerivedScopes = (
  derivedScopes: ScopesInput,
  client: AssistantClient,
) => {
  return useResource(DerivedScopesResource({ scopes: derivedScopes, client }));
};

const useExtendedAssistantClientImpl = (
  scopes: ScopesInput,
): AssistantClient => {
  const baseClient = useAssistantContextValue();
  const { rootScopes, derivedScopes } = splitScopes(scopes);

  const rootFields = useRootScopes(rootScopes, baseClient);
  const derivedFields = useDerivedScopes(derivedScopes, baseClient);

  return useMemo(
    () =>
      ({
        ...baseClient,
        ...rootFields.scopes,
        ...derivedFields,
        subscribe: rootFields.subscribe ?? baseClient.subscribe,
        on: rootFields.on ?? baseClient.on,
      }) as AssistantClient,
    [baseClient, rootFields, derivedFields],
  );
};

export function useAssistantClient(): AssistantClient;
export function useAssistantClient(scopes: ScopesInput): AssistantClient;
export function useAssistantClient(scopes?: ScopesInput): AssistantClient {
  if (scopes) {
    return useExtendedAssistantClientImpl(scopes);
  }
  return useAssistantContextValue();
}
