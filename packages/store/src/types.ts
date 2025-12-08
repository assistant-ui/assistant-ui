import type { ResourceElement } from "@assistant-ui/tap";
import type {
  AssistantEvent,
  AssistantEventCallback,
  AssistantEventSelector,
} from "./EventContext";

/**
 * Base type for methods that can be called on a client.
 */
export interface ClientObject {
  [key: string]: (...args: any[]) => any;
}

type ClientMetaType = { source: string; query: Record<string, unknown> };

/**
 * Definition of a client in the assistant system (internal type).
 * @template TState - The state type for this client
 * @template TMethods - The methods available on this client
 * @template TMeta - Source/query metadata (optional)
 * @template TEvents - Events that this client can emit (optional)
 * @internal
 */
export type ClientDefinition<
  TState extends Record<string, unknown> = Record<string, unknown>,
  TMethods extends ClientObject = ClientObject,
  TMeta extends ClientMetaType = never,
  TEvents extends Record<string, unknown> = never,
> = {
  state: TState;
  methods: TMethods;
  meta?: TMeta;
  events?: TEvents;
};

/**
 * Module augmentation interface for assistant-ui store type extensions.
 *
 * @example
 * ```typescript
 * declare module "@assistant-ui/store" {
 *   interface AssistantClientRegistry {
 *     // Simple client (meta and events are optional)
 *     foo: {
 *       state: { bar: string };
 *       methods: { updateBar: (bar: string) => void };
 *     };
 *     // Full client with meta and events
 *     bar: {
 *       state: { id: string };
 *       methods: { update: () => void };
 *       meta: { source: "fooList"; query: { index: number } };
 *       events: {
 *         "bar.updated": { id: string };
 *       };
 *     };
 *   }
 * }
 * ```
 */
export interface AssistantClientRegistry {}

export type AssistantClients = keyof AssistantClientRegistry extends never
  ? Record<"ERROR: No clients were defined", ClientDefinition>
  : { [K in keyof AssistantClientRegistry]: AssistantClientRegistry[K] };

/**
 * Output type that client resources return with state and methods.
 *
 * @example
 * ```typescript
 * const FooResource = resource((): ClientOutput<"foo"> => {
 *   const [state, setState] = tapState({ bar: "hello" });
 *   return {
 *     state,
 *     methods: {
 *       updateBar: (b) => setState({ bar: b })
 *     }
 *   };
 * });
 * ```
 */
export type ClientOutput<K extends keyof AssistantClients> = {
  state: AssistantClients[K]["state"];
  methods: AssistantClients[K]["methods"];
};

/**
 * Generic version of ClientOutput for library code.
 */
export type ClientOutputOf<TState, TMethods extends ClientObject> = {
  state: TState;
  methods: TMethods;
};

/**
 * Type for a client field - a function that returns the methods,
 * with source/query metadata attached (derived from meta).
 */
export type ClientField<T extends ClientDefinition<any, any, any, any>> = (() => T["methods"]) &
  (
    | NonNullable<T["meta"]>
    | { source: "root"; query: Record<string, never> }
    | { source: null; query: null }
  );

/**
 * Props passed to a derived client resource element.
 */
export type DerivedClientProps<T extends ClientDefinition<any, any, any, any>> = {
  get: (parent: AssistantClient) => T["methods"];
  source: NonNullable<T["meta"]>["source"];
  query: NonNullable<T["meta"]>["query"];
};

/**
 * Input type for client definitions - ResourceElement that returns { state, methods }.
 */
export type ClientInput<T extends ClientDefinition<any, any, any, any>> = ResourceElement<{
  state: T["state"];
  methods: T["methods"];
}>;

/**
 * Map of client names to their input definitions.
 */
export type ClientsInput = {
  [K in keyof AssistantClients]?: ClientInput<AssistantClients[K]>;
};

/**
 * Unsubscribe function type.
 */
export type Unsubscribe = () => void;

/**
 * State type extracted from all clients.
 */
export type AssistantState = {
  [K in keyof AssistantClients]: AssistantClients[K]["state"];
};

/**
 * The assistant client type with all registered clients.
 */
export type AssistantClient = {
  [K in keyof AssistantClients]: ClientField<AssistantClients[K]>;
} & {
  subscribe(listener: () => void): Unsubscribe;
  on<TEvent extends AssistantEvent>(
    selector: AssistantEventSelector<TEvent>,
    callback: AssistantEventCallback<TEvent>,
  ): Unsubscribe;
};
