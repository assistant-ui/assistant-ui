import { resource, tapEffect } from "@assistant-ui/tap";
import { tapMemo, tapRef, tapResource, tapResources } from "@assistant-ui/tap";
import { createAssistantApiField } from "../../context/react/AssistantApiContext";
import type {
  AssistantApi,
  AssistantApiField,
} from "../../context/react/AssistantApiContext";
import type {
  AssistantEvent,
  AssistantEventCallback,
  AssistantEventSelector,
} from "../../types/EventTypes";
import type { ResourceElement } from "@assistant-ui/tap";
import { Unsubscribe } from "../../types";

/**
 * Extract the API return type from an AssistantApiField
 */
type ExtractApiType<T> =
  T extends AssistantApiField<infer TApi, any> ? TApi : never;

/**
 * Extract the metadata type from an AssistantApiField
 *
 * Used in DerivedScopesInput to validate that each field's source/query types match
 * the expected types from AssistantApi.
 */
type ExtractMeta<T> =
  T extends AssistantApiField<any, infer TMeta> ? TMeta : never;

/**
 * Get only the field names from AssistantApi (exclude method names)
 */
type AssistantApiFieldNames = {
  [K in keyof AssistantApi]: AssistantApi[K] extends { source: any; query: any }
    ? K
    : never;
}[keyof AssistantApi];

/**
 * Configuration for a derived scope field - infers types from the actual values provided
 */
export type DerivedConfig<TSource extends string | null, TQuery, TApi> = {
  source: TSource;
  query: TQuery;
  get: () => TApi;
};

/**
 * Type for the special `on` callback function
 */
export type OnCallbackFn = <TEvent extends AssistantEvent>(
  selector: AssistantEventSelector<TEvent>,
  callback: AssistantEventCallback<TEvent>,
) => Unsubscribe;

/**
 * Type for the special `subscribe` callback function
 */
export type SubscribeCallbackFn = (listener: () => void) => Unsubscribe;

/**
 * Type for special non-field functions in AssistantApi
 */
export type SpecialCallbacks = {
  on?: OnCallbackFn;
  subscribe?: SubscribeCallbackFn;
};

/**
 * Type for the scopes parameter - allows both DerivedScope elements and special callbacks.
 * Field names are restricted to valid AssistantApi field names.
 * TypeScript validates that the source/query/get types match the expected field type.
 */
export type DerivedScopesInput = {
  [K in AssistantApiFieldNames]?: ResourceElement<
    AssistantApiField<
      ExtractApiType<AssistantApi[K]>,
      {
        source: ExtractMeta<AssistantApi[K]>["source"];
        query: ExtractMeta<AssistantApi[K]>["query"];
      }
    >
  >;
} & SpecialCallbacks;

/**
 * DerivedScope resource - memoizes an AssistantApiField based on source and query.
 * The get callback always calls the most recent version (useEffectEvent pattern).
 * TypeScript infers TSource, TQuery, and TApi from the config object.
 * Validation happens at the DerivedScopesInput level.
 */
export const DerivedScope = resource(
  <TSource extends string | null, TQuery, TApi>(
    config: DerivedConfig<TSource, TQuery, TApi>,
  ): AssistantApiField<
    TApi,
    {
      source: TSource;
      query: TQuery;
    }
  > => {
    const getRef = tapRef(config.get);
    tapEffect(() => {
      getRef.current = config.get;
    });

    return tapMemo(() => {
      return createAssistantApiField({
        source: config.source,
        query: config.query,
        get: () => getRef.current(),
      });
    }, [config.source, JSON.stringify(config.query)]);
  },
);

/**
 * Helper resource to wrap each scope field - stable resource identity for proper memoization.
 * Creating this outside the map ensures tapResources can properly track and memoize each field.
 */
const ScopeFieldWithNameResource = resource(
  (config: {
    fieldName: string;
    scopeElement: ReturnType<typeof DerivedScope>;
  }) => {
    const field = tapResource(config.scopeElement);
    return tapMemo(
      () => [config.fieldName, field] as const,
      [config.fieldName, field],
    );
  },
);

/**
 * DerivedScopes resource - takes an object of DerivedScope resource elements and special callbacks,
 * and returns a Partial<AssistantApi> with all the derived fields.
 */
export const DerivedScopes = resource(
  (scopes: DerivedScopesInput): Partial<AssistantApi> => {
    const { on, subscribe, ...scopeFields } = scopes;
    const callbacksRef = tapRef({ on, subscribe });
    tapEffect(() => {
      callbacksRef.current = { on, subscribe };
    });

    const results = tapResources(
      scopeFields as Record<string, ReturnType<typeof DerivedScope>>,
      (scopeElement, fieldName) =>
        ScopeFieldWithNameResource({
          fieldName,
          scopeElement,
        }),
      [],
    );

    return tapMemo(() => {
      const result = Object.fromEntries(
        Object.values(results),
      ) as Partial<AssistantApi>;

      const { on: onCb, subscribe: subCb } = callbacksRef.current;

      if (onCb) {
        result.on = <TEvent extends AssistantEvent>(
          selector: AssistantEventSelector<TEvent>,
          callback: AssistantEventCallback<TEvent>,
        ) => onCb(selector, callback);
      }
      if (subCb) result.subscribe = (listener) => subCb(listener);

      return result;
    }, [results]);
  },
);
