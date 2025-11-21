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
import { asStore } from "./asStore";
import { useAssistantContextValue } from "./AssistantContext";
import { splitScopes } from "./utils/splitScopes";
import {
  EventManager,
  normalizeEventSelector,
  type AssistantEvent,
  type AssistantEventCallback,
  type AssistantEventSelector,
} from "./EventContext";
import { withStoreContextProvider } from "./StoreContext";

/**
 * Resource for a single root scope
 * Returns a tuple of [scopeName, {scopeFunction, subscribe, flushSync}]
 */
const RootScopeResource = resource(
  <K extends keyof AssistantScopes>({
    scopeName,
    element,
  }: {
    scopeName: K;
    element: ScopeInput<AssistantScopes[K]>;
  }) => {
    const store = tapResource(asStore(element));

    return tapMemo(() => {
      const scopeFunction = (() => store.getState().api) as ScopeField<
        AssistantScopes[K]
      >;
      scopeFunction.source = "root";
      scopeFunction.query = {} as AssistantScopes[K]["query"];

      return [
        scopeName,
        {
          scopeFunction,
          subscribe: store.subscribe,
          flushSync: store.flushSync,
        },
      ] as const;
    }, [scopeName, store]);
  },
);

/**
 * Resource for all root scopes
 * Mounts each root scope and returns an object mapping scope names to their stores
 */
const RootScopesResource = resource(
  ({ scopes, parent }: { scopes: ScopesInput; parent: AssistantClient }) => {
    const events = tapInlineResource(EventManager());

    const resultEntries = withStoreContextProvider({ events, parent }, () =>
      tapResources(
        Object.entries(scopes).map(([scopeName, element]) =>
          RootScopeResource(
            {
              scopeName: scopeName as keyof AssistantScopes,
              element: element as ScopeInput<
                AssistantScopes[keyof AssistantScopes]
              >,
            },
            { key: scopeName },
          ),
        ),
      ),
    );

    const on = <TEvent extends AssistantEvent>(
      selector: AssistantEventSelector<TEvent>,
      callback: AssistantEventCallback<TEvent>,
    ) => {
      const { event } = normalizeEventSelector(selector);
      return events.on(event, callback);
    };

    return tapMemo(() => {
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
        ) as {
          [K in keyof typeof scopes]: ScopeField<AssistantScopes[K]>;
        },
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
        flushSync: () => {
          resultEntries.forEach(([, { flushSync }]) => {
            flushSync();
          });
        },
        on,
      };
    }, [...resultEntries, events]);
  },
);

/**
 * Hook to mount and access root scopes
 */
export const useRootScopes = (
  rootScopes: ScopesInput,
  parent: AssistantClient,
) => {
  return useResource(RootScopesResource({ scopes: rootScopes, parent }));
};

/**
 * Resource for a single derived scope
 * Returns a tuple of [scopeName, scopeFunction] where scopeFunction has source and query
 */
const DerivedScopeResource = resource(
  <K extends keyof AssistantScopes>({
    scopeName,
    element,
    parentClient,
  }: {
    scopeName: K;
    element: ResourceElement<
      AssistantScopes[K],
      DerivedScopeProps<AssistantScopes[K]>
    >;
    parentClient: AssistantClient;
  }) => {
    const get = tapEffectEvent(element.props.get);
    const source = element.props.source;
    const query = element.props.query;
    return tapMemo(() => {
      const scopeFunction = (() => get(parentClient)) as ScopeField<
        AssistantScopes[K]
      >;
      scopeFunction.source = source;
      scopeFunction.query = query;

      return [scopeName, scopeFunction] as const;
    }, [scopeName, get, source, JSON.stringify(query), parentClient]);
  },
);

/**
 * Resource for all derived scopes
 * Builds stable scope functions with source and query metadata
 */
const DerivedScopesResource = resource(
  ({
    scopes,
    parentClient,
  }: {
    scopes: ScopesInput;
    parentClient: AssistantClient;
  }) => {
    const resultEntries = tapResources(
      Object.entries(scopes).map(([scopeName, element]) =>
        DerivedScopeResource(
          {
            scopeName: scopeName as keyof AssistantScopes,
            element: element as ScopeInput<
              AssistantScopes[keyof AssistantScopes]
            >,
            parentClient,
          },
          { key: scopeName },
        ),
      ),
    );

    return tapMemo(() => {
      return Object.fromEntries(resultEntries) as {
        [K in keyof typeof scopes]: ScopeField<AssistantScopes[K]>;
      };
    }, [...resultEntries]);
  },
);

/**
 * Hook to mount and access derived scopes
 */
export const useDerivedScopes = (
  derivedScopes: ScopesInput,
  parentClient: AssistantClient,
) => {
  return useResource(
    DerivedScopesResource({ scopes: derivedScopes, parentClient }),
  );
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
      flushSync: rootFields.flushSync ?? baseClient.flushSync,
      on: rootFields.on ?? baseClient.on,
    } as AssistantClient;
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
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useExtendedAssistantClientImpl(scopes);
  } else {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useAssistantContextValue();
  }
}
