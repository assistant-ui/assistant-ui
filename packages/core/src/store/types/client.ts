import type { ResourceElement } from "@assistant-ui/tap";
import type {
  AssistantEventName,
  AssistantEventCallback,
  AssistantEventSelector,
} from "./events";

/**
 * Base type for methods that can be called on a client.
 */
export interface ClientMethods {
  [key: string | symbol]: (...args: any[]) => any;
}

type ClientMetaType = { source: ClientNames; query: Record<string, unknown> };

/**
 * Schema of a client in the assistant system (internal type).
 * @template TState - The state type for this client
 * @template TMethods - The methods available on this client
 * @template TMeta - Source/query metadata (optional)
 * @template TEvents - Events that this client can emit (optional)
 * @internal
 */
export type ClientSchema<
  TMethods extends ClientMethods = ClientMethods,
  TMeta extends ClientMetaType = never,
  TEvents extends Record<string, unknown> = never,
> = {
  methods: TMethods;
  meta?: TMeta;
  events?: TEvents;
};

/**
 * Module augmentation interface for assistant-ui store type extensions.
 *
 * @example
 * ```typescript
 * declare module "@assistant-ui/core/store" {
 *   interface ScopeRegistry {
 *     // Simple client (meta and events are optional)
 *     foo: {
 *       methods: {
 *         getState: () => { bar: string };
 *         updateBar: (bar: string) => void;
 *       };
 *     };
 *     // Full client with meta and events
 *     bar: {
 *       methods: {
 *         getState: () => { id: string };
 *         update: () => void;
 *       };
 *       meta: { source: "fooList"; query: { index: number } };
 *       events: {
 *         "bar.updated": { id: string };
 *       };
 *     };
 *   }
 * }
 * ```
 */
export interface ScopeRegistry {}

type ClientEventsType<K extends ClientNames> = Record<
  `${K}.${string}`,
  unknown
>;

type ClientError<E extends string> = {
  methods: Record<E, () => E>;
  meta: { source: ClientNames; query: Record<E, E> };
  events: Record<`${E}.`, E>;
};

type ValidateClient<K extends keyof ScopeRegistry> = ScopeRegistry[K] extends {
  methods: ClientMethods;
}
  ? "meta" extends keyof ScopeRegistry[K]
    ? ScopeRegistry[K]["meta"] extends ClientMetaType
      ? "events" extends keyof ScopeRegistry[K]
        ? ScopeRegistry[K]["events"] extends ClientEventsType<K>
          ? ScopeRegistry[K]
          : ClientError<`ERROR: ${K & string} has invalid events type`>
        : ScopeRegistry[K]
      : ClientError<`ERROR: ${K & string} has invalid meta type`>
    : "events" extends keyof ScopeRegistry[K]
      ? ScopeRegistry[K]["events"] extends ClientEventsType<K>
        ? ScopeRegistry[K]
        : ClientError<`ERROR: ${K & string} has invalid events type`>
      : ScopeRegistry[K]
  : ClientError<`ERROR: ${K & string} has invalid methods type`>;

type ClientSchemas = keyof ScopeRegistry extends never
  ? {
      "ERROR: No clients were defined": ClientError<"ERROR: No clients were defined">;
    }
  : { [K in keyof ScopeRegistry]: ValidateClient<K> };

/**
 * Output type that client resources return (just methods).
 *
 * @example
 * ```typescript
 * const FooResource = resource((): ClientResourceOutput<"foo"> => {
 *   const [state, setState] = tapState({ bar: "hello" });
 *   return {
 *     getState: () => state,
 *     updateBar: (b) => setState({ bar: b }),
 *   };
 * });
 * ```
 */
export type ClientOutput<K extends ClientNames> = ClientSchemas[K]["methods"] &
  ClientMethods;

export type ClientNames = keyof ClientSchemas extends infer U ? U : never;

export type ClientEvents<K extends ClientNames> =
  "events" extends keyof ClientSchemas[K]
    ? ClientSchemas[K]["events"] extends ClientEventsType<K>
      ? ClientSchemas[K]["events"]
      : never
    : never;

export type ClientMeta<K extends ClientNames> =
  "meta" extends keyof ClientSchemas[K]
    ? Pick<
        ClientSchemas[K]["meta"] extends ClientMetaType
          ? ClientSchemas[K]["meta"]
          : never,
        "source" | "query"
      >
    : never;

export type ClientElement<K extends ClientNames> = ResourceElement<
  ClientOutput<K>
>;

/**
 * Unsubscribe function type.
 */
export type Unsubscribe = () => void;

/**
 * State type extracted from all clients via their getState() methods.
 */
export type AssistantState = {
  [K in ClientNames]: ClientSchemas[K]["methods"] extends {
    getState: () => infer S;
  }
    ? S
    : never;
};

/**
 * Type for a client accessor - a function that returns the methods,
 * with source/query metadata attached (derived from meta).
 */
export type AssistantClientAccessor<K extends ClientNames> =
  (() => ClientSchemas[K]["methods"]) &
    (
      | ClientMeta<K>
      | { source: "root"; query: Record<string, never> }
      | { source: null; query: null }
    ) & { name: K };

/**
 * The assistant client type with all registered clients.
 */
export type AssistantClient = {
  [K in ClientNames]: AssistantClientAccessor<K>;
} & {
  subscribe(listener: () => void): Unsubscribe;
  on<TEvent extends AssistantEventName>(
    selector: AssistantEventSelector<TEvent>,
    callback: AssistantEventCallback<TEvent>,
  ): Unsubscribe;
};
