import type { ResourceElement } from "@assistant-ui/tap";

/**
 * Definition of a scope in the assistant client (internal type)
 * @template TValue - The API type (must include getState() and any actions)
 * @template TSource - The parent scope name (or "root" for top-level scopes)
 * @template TQuery - The query parameters needed to access this scope from its source
 * @internal
 */
export type ScopeDefinition<
  TValue = any,
  TSource extends string | "root" = any,
  TQuery = any,
> = {
  value: TValue;
  source: TSource;
  query: TQuery;
};

/**
 * Global interface for defining scopes via module augmentation.
 * Users extend this interface to define their own scopes by implementing
 * the scope definition raw (without importing ScopeDefinition).
 *
 * @example
 * ```typescript
 * declare module "@assistant-ui/store" {
 *   interface AssistantScopes {
 *     foo: {
 *       value: { getState: () => { bar: string }; updateBar: (bar: string) => void };
 *       source: "root";
 *       query: Record<string, never>;
 *     };
 *   }
 * }
 * ```
 */
export interface AssistantScopes {
  test: {
    value: {
      getState: () => { bar: string };
      updateBar: (bar: string) => void;
    };
    source: "root";
    query: Record<string, never>;
  };
}

/**
 * Helper type to extract the value type from a scope definition
 */
export type ScopeValue<T extends ScopeDefinition> = T["value"];

/**
 * Helper type to extract the source type from a scope definition
 */
export type ScopeSource<T extends ScopeDefinition> = T["source"];

/**
 * Helper type to extract the query type from a scope definition
 */
export type ScopeQuery<T extends ScopeDefinition> = T["query"];

/**
 * Type for a scope field - a function that returns the current API value,
 * with source and query metadata attached
 */
export type ScopeField<T extends ScopeDefinition> = (() => ScopeValue<T>) & {
  source: ScopeSource<T>;
  query: ScopeQuery<T>;
};

/**
 * Props passed to a derived scope resource element
 */
export type DerivedScopeProps<T extends ScopeDefinition> = {
  get: () => ScopeValue<T>;
  source: ScopeSource<T>;
  query: ScopeQuery<T>;
};

/**
 * Input type for scope definitions - ResourceElement that returns the API value
 * Can optionally include source/query metadata via DerivedScope
 */
export type ScopeInput<T extends ScopeDefinition> = ResourceElement<{
  api: ScopeValue<T>;
}>;

/**
 * Map of scope names to their input definitions
 */
export type ScopesInput = {
  [K in keyof AssistantScopes]?: ScopeInput<AssistantScopes[K]>;
};

/**
 * Unsubscribe function type
 */
export type Unsubscribe = () => void;

/**
 * State type extracted from all scopes
 */
export type AssistantState = {
  [K in keyof AssistantScopes]: ReturnType<
    AssistantScopes[K]["value"]["getState"]
  >;
};

/**
 * The assistant client type with all registered scopes
 */
export type AssistantClient = {
  [K in keyof AssistantScopes]: ScopeField<AssistantScopes[K]>;
} & {
  subscribe(listener: () => void): Unsubscribe;
  flushSync(): void;
};
