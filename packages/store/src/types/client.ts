import type { ResourceElement } from "@assistant-ui/tap";
import type {
  AssistantEvent,
  AssistantEventCallback,
  AssistantEventSelector,
} from "./events";
import { Derived } from "../Derived";

/**
 * Base type for methods that can be called on a client.
 */
export interface ClientMethods {
  [key: string]: (...args: any[]) => any;
}

type ClientMetaType = { source: string; query: Record<string, unknown> };

/**
 * Schema of a client in the assistant system (internal type).
 * @template TState - The state type for this client
 * @template TMethods - The methods available on this client
 * @template TMeta - Source/query metadata (optional)
 * @template TEvents - Events that this client can emit (optional)
 * @internal
 */
export type ClientSchema<
  TState extends Record<string, unknown> = Record<string, unknown>,
  TMethods extends ClientMethods = ClientMethods,
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
 *   interface ClientRegistry {
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
export interface ClientRegistry {}

export type ClientSchemas = keyof ClientRegistry extends never
  ? Record<"ERROR: No clients were defined", ClientSchema>
  : { [K in keyof ClientRegistry]: ClientRegistry[K] };

/**
 * Output type that client resources return with state and methods.
 *
 * @example
 * ```typescript
 * const FooResource = resource((): ClientResourceOutput<"foo"> => {
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
export type ClientResourceOutput<K extends keyof ClientSchemas> = {
  state: ClientSchemas[K]["state"];
  methods: ClientSchemas[K]["methods"];
};

/**
 * Generic version of ClientResourceOutput for library code.
 */
export type ClientResourceOutputOf<TState, TMethods extends ClientMethods> = {
  state: TState;
  methods: TMethods;
};

/**
 * Type for a client accessor - a function that returns the methods,
 * with source/query metadata attached (derived from meta).
 */
export type ClientAccessor<T extends ClientSchema<any, any, any, any>> =
  (() => T["methods"]) &
    (
      | NonNullable<T["meta"]>
      | { source: "root"; query: Record<string, never> }
      | { source: null; query: null }
    );

/**
 * ResourceElement that returns { state, methods } for a client.
 */
export type ClientResourceElement<T extends ClientSchema<any, any, any, any>> =
  ResourceElement<{
    state: T["state"];
    methods: T["methods"];
  }>;

/**
 * Map of client names to their ResourceElements.
 */
export type ClientResourceElements = {
  [K in keyof ClientSchemas]?:
    | ClientResourceElement<ClientSchemas[K]>
    | ResourceElement<null, Derived.Props<ClientSchemas[K]>>;
};

/**
 * Unsubscribe function type.
 */
export type Unsubscribe = () => void;

/**
 * State type extracted from all clients.
 */
export type AssistantState = {
  [K in keyof ClientSchemas]: ClientSchemas[K]["state"];
};

/**
 * The assistant client type with all registered clients.
 */
export type AssistantClient = {
  [K in keyof ClientSchemas]: ClientAccessor<ClientSchemas[K]>;
} & {
  subscribe(listener: () => void): Unsubscribe;
  on<TEvent extends AssistantEvent>(
    selector: AssistantEventSelector<TEvent>,
    callback: AssistantEventCallback<TEvent>,
  ): Unsubscribe;
};
