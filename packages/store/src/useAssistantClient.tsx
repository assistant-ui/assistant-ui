import { useMemo } from "react";
import { useResource } from "@assistant-ui/tap/react";
import {
  resource,
  tapMemo,
  tapResource,
  tapResources,
  tapEffectEvent,
  tapInlineResource,
  ResourceElement,
} from "@assistant-ui/tap";
import type {
  AssistantClient,
  AssistantScopes,
  ScopesInput,
  ScopeField,
  ScopeInput,
  DerivedScopeProps,
} from "./types";
import { asStore } from "./utils/asStore";
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

/**
 * Resource that renders a store with the store context provider.
 * This ensures the context is re-established on every re-render.
 * Wraps the plain element with tapClientResource to get { state, client } structure.
 */
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

/**
 * Resource for a single root scope
 * Returns a tuple of [scopeName, {scopeFunction, subscribe}]
 */
const RootScopeResource = resource(
  <K extends keyof AssistantScopes>({
    element,
    events,
    client,
  }: {
    element: ScopeInput<AssistantScopes[K]>;
    events: EventManager;
    client: AssistantClient;
  }) => {
    const store = tapResource(
      asStore(RootScopeStoreResource({ element, events, client })),
    );

    return tapMemo(() => {
      const scopeFunction = () => store.getState().client;
      scopeFunction.source = "root" as const;
      scopeFunction.query = {};

      return {
        scopeFunction: scopeFunction satisfies ScopeField<AssistantScopes[K]>,
        subscribe: store.subscribe,
      };
    }, [store]);
  },
);

/**
 * Resource for all root scopes
 * Mounts each root scope and returns an object mapping scope names to their stores
 */
const RootScopesResource = resource(
  ({ scopes, client }: { scopes: ScopesInput; client: AssistantClient }) => {
    const events = tapInlineResource(EventManager());

    const results = tapResources(scopes, (element) =>
      RootScopeResource({ element: element!, events, client }),
    );

    const on = <TEvent extends AssistantEvent>(
      selector: AssistantEventSelector<TEvent>,
      callback: AssistantEventCallback<TEvent>,
    ) => {
      const { event } = normalizeEventSelector(selector);
      return events.on(event, callback);
    };

    return tapMemo(() => {
      const resultEntries = Object.entries(results);
      if (resultEntries.length === 0) {
        return {
          scopes: {},
          on,
        };
      }

      return {
        scopes: Object.fromEntries(
          resultEntries.map(([scopeName, { scopeFunction }]) => [
            scopeName,
            scopeFunction,
          ]),
        ),
        subscribe: (callback: () => void) => {
          const unsubscribes = resultEntries.map(([, { subscribe }]) => {
            return subscribe(() => {
              console.log("Callback called for");
              callback();
            });
          });
          return () => {
            unsubscribes.forEach((unsubscribe) => unsubscribe());
          };
        },
        on,
      };
    }, [results, events]);
  },
);

/**
 * Hook to mount and access root scopes
 */
export const useRootScopes = (
  rootScopes: ScopesInput,
  client: AssistantClient,
) => {
  return useResource(RootScopesResource({ scopes: rootScopes, client }));
};

/**
 * Resource for a single derived scope
 * Returns a tuple of [scopeName, scopeFunction] where scopeFunction has source and query
 */
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
    const source = element.props.source;
    const query = element.props.query;
    return tapMemo(() => {
      const scopeFunction = () => get(client);
      scopeFunction.source = source;
      scopeFunction.query = query;

      return scopeFunction satisfies ScopeField<AssistantScopes[K]>;
    }, [get, source, JSON.stringify(query), client]);
  },
);

/**
 * Resource for all derived scopes
 * Builds stable scope functions with source and query metadata
 */
const DerivedScopesResource = resource(
  ({ scopes, client }: { scopes: ScopesInput; client: AssistantClient }) => {
    return tapResources(
      scopes,
      (element) =>
        DerivedScopeResource({
          element: element!,
          client,
        }),
      [],
    );
  },
);

/**
 * Hook to mount and access derived scopes
 */
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

  // Mount the scopes to keep them alive
  const rootFields = useRootScopes(rootScopes, baseClient);
  const derivedFields = useDerivedScopes(derivedScopes, baseClient);

  return useMemo(() => {
    // Merge base client with extended client
    // If baseClient is the default proxy, spreading it will be a no-op
    return {
      ...baseClient,
      ...rootFields.scopes,
      ...derivedFields,
      subscribe: rootFields.subscribe ?? baseClient.subscribe,
      on: rootFields.on ?? baseClient.on,
    };
  }, [baseClient, rootFields, derivedFields]);
};

/**
 * Hook to access or extend the AssistantClient
 *
 * @example Without config - returns the client from context:
 * ```typescript
 * const client = useAssistantClient();
 * const fooState = client.foo.getState();
 * ```
 *
 * @example With config - creates a new client with additional scopes:
 * ```typescript
 * const client = useAssistantClient({
 *   message: DerivedScope({
 *     source: "thread",
 *     query: { type: "index", index: 0 },
 *     get: () => messageApi,
 *   }),
 * });
 * ```
 */
export function useAssistantClient(): AssistantClient;
export function useAssistantClient(scopes: ScopesInput): AssistantClient;
export function useAssistantClient(scopes?: ScopesInput): AssistantClient {
  if (scopes) {
    return useExtendedAssistantClientImpl(scopes);
  } else {
    return useAssistantContextValue();
  }
}
