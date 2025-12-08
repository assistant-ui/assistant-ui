import type { ResourceElement } from "@assistant-ui/tap";
import type {
  AssistantEvent,
  AssistantEventCallback,
  AssistantEventSelector,
} from "./EventContext";

/**
 * Client object type - functions that can be called on a scope
 */
export interface ClientObject {
  [key: string]: (...args: any[]) => any;
}

type ScopeMetaType = { source: string; query: Record<string, unknown> };

/**
 * Definition of a scope in the assistant client (internal type)
 * @template TState - The state type for this scope
 * @template TClient - The client type (methods - getState is optional)
 * @template TMeta - Source/query metadata (optional)
 * @template TEvents - Events that this scope can emit (optional)
 * @internal
 */
export type ScopeDefinition<
  TState extends Record<string, unknown> = Record<string, unknown>,
  TClient extends ClientObject = ClientObject,
  TMeta extends ScopeMetaType = never,
  TEvents extends Record<string, unknown> = never,
> = {
  state: TState;
  client: TClient;
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
 *       client: { updateBar: (bar: string) => void };
 *     };
 *     // Full scope with meta and events
 *     bar: {
 *       state: { id: string };
 *       client: { update: () => void };
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
 * Output type that scope resources return with state and client.
 *
 * @example
 * ```typescript
 * const FooResource = resource((): ScopeOutput<"foo"> => {
 *   const [state, setState] = tapState({ bar: "hello" });
 *   return {
 *     state,
 *     client: {
 *       updateBar: (b) => setState({ bar: b })
 *     }
 *   };
 * });
 * ```
 */
export type ScopeOutput<K extends keyof AssistantScopes> = {
  state: AssistantScopes[K]["state"];
  client: AssistantScopes[K]["client"];
};

/**
 * Generic version of ScopeOutput for library code.
 */
export type ScopeOutputOf<TState, TClient extends ClientObject> = {
  state: TState;
  client: TClient;
};

/**
 * Type for a scope field - a function that returns the client,
 * with source/query metadata attached (derived from meta)
 */
export type ScopeField<T extends ScopeDefinition> = (() => T["client"]) &
  (
    | NonNullable<T["meta"]>
    | { source: "root"; query: Record<string, never> }
    | { source: null; query: null }
  );

/**
 * Props passed to a derived scope resource element
 */
export type DerivedScopeProps<T extends ScopeDefinition<any, any, any, any>> = {
  get: (parent: AssistantClient) => T["client"];
  source: NonNullable<T["meta"]>["source"];
  query: NonNullable<T["meta"]>["query"];
};

/**
 * Input type for scope definitions - ResourceElement that returns { state, client }
 * Can optionally include source/query metadata via DerivedScope
 */
export type ScopeInput<T extends ScopeDefinition> = ResourceElement<{
  state: T["state"];
  client: T["client"];
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
  on<TEvent extends AssistantEvent>(
    selector: AssistantEventSelector<TEvent>,
    callback: AssistantEventCallback<TEvent>,
  ): Unsubscribe;
};
