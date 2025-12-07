import type { ResourceElement } from "@assistant-ui/tap";
import type {
  AssistantEvent,
  AssistantEventCallback,
  AssistantEventSelector,
} from "./EventContext";
import { ApiObject } from "./tapApiResource";

type ScopeMetaType = { source: string; query: Record<string, unknown> };

/**
 * Definition of a scope in the assistant client (internal type)
 * @template TState - The state type for this scope
 * @template TApi - The API type (actions/methods - getState is optional)
 * @template TMeta - Source/query metadata (optional)
 * @template TEvents - Events that this scope can emit (optional)
 * @internal
 */
export type ScopeDefinition<
  TState extends Record<string, unknown> = Record<string, unknown>,
  TApi extends ApiObject = ApiObject,
  TMeta extends ScopeMetaType = never,
  TEvents extends Record<string, unknown> = never,
> = {
  state: TState;
  api: TApi;
  meta?: TMeta;
  events?: TEvents;
};

/**
 * Module augmentation interface for assistant-ui store type extensions.
 *
 * @example
 * ```typescript
 * declare module "@assistant-ui/store" {
 *   interface AssistantScopeRegistry {
 *     // Simple scope (meta and events are optional)
 *     foo: {
 *       state: { bar: string };
 *       api: { updateBar: (bar: string) => void };
 *     };
 *     // Full scope with meta and events
 *     bar: {
 *       state: { id: string };
 *       api: { update: () => void };
 *       meta: { source: "fooList"; query: { index: number } };
 *       events: {
 *         "bar.updated": { id: string };
 *       };
 *     };
 *   }
 * }
 * ```
 */
export interface AssistantScopeRegistry {}

export type AssistantScopes = keyof AssistantScopeRegistry extends never
  ? Record<"ERROR: No scopes were defined", ScopeDefinition>
  : { [K in keyof AssistantScopeRegistry]: AssistantScopeRegistry[K] };

/**
 * Object type that resources return with state, optional key, and api.
 *
 * @example
 * ```typescript
 * const FooResource = resource((): ScopeApi<"foo"> => {
 *   const [state, setState] = tapState({ bar: "hello" });
 *   return {
 *     state,
 *     key: "foo-1",
 *     api: {
 *       updateBar: (b) => setState({ bar: b })
 *     }
 *   };
 * });
 * ```
 */
export type ScopeApi<K extends keyof AssistantScopes> = {
  key?: string;
  state: AssistantScopes[K]["state"];
  api: AssistantScopes[K]["api"];
};

/**
 * Type for a scope field - a function that returns the API,
 * with source/query metadata attached (derived from meta)
 */
export type ScopeField<T extends ScopeDefinition> = (() => T["api"]) &
  (
    | NonNullable<T["meta"]>
    | { source: "root"; query: Record<string, never> }
    | { source: null; query: null }
  );

/**
 * Props passed to a derived scope resource element
 */
export type DerivedScopeProps<T extends ScopeDefinition> = {
  get: (parent: AssistantClient) => T["api"];
  source: NonNullable<T["meta"]>["source"];
  query: NonNullable<T["meta"]>["query"];
};

/**
 * Input type for scope definitions - ResourceElement that returns { state, key?, api }
 * Can optionally include source/query metadata via DerivedScope
 */
export type ScopeInput<T extends ScopeDefinition> = ResourceElement<{
  key?: string;
  state: T["state"];
  api: T["api"];
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
  [K in keyof AssistantScopes]: AssistantScopes[K]["state"];
};

/**
 * The assistant client type with all registered scopes
 */
export type AssistantClient = {
  [K in keyof AssistantScopes]: ScopeField<AssistantScopes[K]>;
} & {
  subscribe(listener: () => void): Unsubscribe;
  flushSync(): void;
  on<TEvent extends AssistantEvent>(
    selector: AssistantEventSelector<TEvent>,
    callback: AssistantEventCallback<TEvent>,
  ): Unsubscribe;
};
