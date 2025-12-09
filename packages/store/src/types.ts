import type { ResourceElement } from "@assistant-ui/tap";
import type {
  AssistantEvent,
  AssistantEventCallback,
  AssistantEventSelector,
} from "./EventContext";

type ScopeValueType = Record<string, unknown> & {
  getState: () => Record<string, unknown>;
};
type ScopeMetaType = { source: string; query: Record<string, unknown> };

/**
 * Definition of a scope in the assistant client (internal type)
 * @template TValue - The API type (must include getState() and any actions)
 * @template TMeta - Source/query metadata (use ScopeMeta or discriminated union)
 * @template TEvents - Optional events that this scope can emit
 * @internal
 */
export type ScopeDefinition<
  TValue extends ScopeValueType = ScopeValueType,
  TMeta extends ScopeMetaType = ScopeMetaType,
  TEvents extends Record<string, unknown> = Record<string, unknown>,
> = {
  value: TValue;
  meta: TMeta;
  events: TEvents;
};

/**
 * Module augmentation interface for assistant-ui store type extensions.
 *
 * @example
 * ```typescript
 * declare module "@assistant-ui/store" {
 *   interface AssistantScopeRegistry {
 *     foo: {
 *       value: { getState: () => { bar: string }; updateBar: (bar: string) => void };
 *       meta: { source: "root"; query: Record<string, never> };
 *       events: {
 *         "foo.updated": { id: string; newValue: string };
 *         "foo.deleted": { id: string };
 *       };
 *     };
 *     // Example with multiple sources (discriminated union):
 *     bar: {
 *       value: { getState: () => { id: string } };
 *       meta:
 *         | { source: "fooList"; query: { index: number } }
 *         | { source: "barList"; query: { id: string } };
 *       events: Record<string, never>;
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
 * Type for a scope field - a function that returns the current API value,
 * with source/query metadata attached (derived from meta)
 */
export type ScopeField<T extends ScopeDefinition> = (() => T["value"]) &
  (T["meta"] | { source: null; query: null });

/**
 * Props passed to a derived scope resource element
 */
export type DerivedScopeProps<T extends ScopeDefinition> = {
  get: (parent: AssistantClient) => T["value"];
  source: T["meta"]["source"];
  query: T["meta"]["query"];
};

/**
 * Input type for scope definitions - ResourceElement that returns the API value
 * Can optionally include source/query metadata via DerivedScope
 */
export type ScopeInput<T extends ScopeDefinition> = ResourceElement<{
  api: T["value"];
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
  on<TEvent extends AssistantEvent>(
    selector: AssistantEventSelector<TEvent>,
    callback: AssistantEventCallback<TEvent>,
  ): Unsubscribe;
};
