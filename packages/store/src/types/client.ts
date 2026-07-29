import { type ResourceElement } from "@assistant-ui/tap";
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
 * Schema of a client in the assistant system.
 * @template TState - The state type for this client
 * @template TMethods - The methods available on this client
 * @template TMeta - Source/query metadata (optional)
 * @template TEvents - Events that this client can emit (optional)
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
 * declare module "@assistant-ui/store" {
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

type ClientEventsType<K extends string> = Record<`${K}.${string}`, unknown>;

type ClientError<E extends string> = {
  methods: Record<E, () => E>;
  meta: { source: ClientNames; query: Record<E, E> };
  events: Record<`${E}.`, E>;
};

type ReservedAccessorProps = "source" | "query" | "name";

type ReservedScopeNames = "optional" | "subscribe" | "on";

export type ValidateClient<
  K extends string,
  TClient,
> = K extends ReservedScopeNames
  ? ClientError<`ERROR: ${K} is a reserved scope name`>
  : TClient extends {
        methods: ClientMethods;
      }
    ? keyof TClient["methods"] & ReservedAccessorProps extends never
      ? "meta" extends keyof TClient
        ? TClient["meta"] extends ClientMetaType
          ? "events" extends keyof TClient
            ? TClient["events"] extends ClientEventsType<K>
              ? TClient
              : ClientError<`ERROR: ${K} has invalid events type`>
            : TClient
          : ClientError<`ERROR: ${K} has invalid meta type`>
        : "events" extends keyof TClient
          ? TClient["events"] extends ClientEventsType<K>
            ? TClient
            : ClientError<`ERROR: ${K} has invalid events type`>
          : TClient
      : ClientError<`ERROR: ${K} methods declare a reserved accessor property (source/query/name)`>
    : ClientError<`ERROR: ${K} has invalid methods type`>;

type ClientSchemas = keyof ScopeRegistry extends never
  ? {
      "ERROR: No clients were defined": ClientError<"ERROR: No clients were defined">;
    }
  : {
      [K in keyof ScopeRegistry]: ValidateClient<K & string, ScopeRegistry[K]>;
    };

/**
 * Output type that client resources return (just methods).
 *
 * @example
 * ```typescript
 * const useFoo = (): ClientResourceOutput<"foo"> => {
 *   const [state, setState] = useState({ bar: "hello" });
 *   return {
 *     getState: () => state,
 *     updateBar: (b) => setState({ bar: b }),
 *   };
 * };
 *
 * const FooResource = resource(useFoo);
 * ```
 */
export type ClientOutput<K extends ClientNames> = ClientSchemas[K]["methods"] &
  ClientMethods;

export type ClientNames = keyof ClientSchemas extends infer U ? U : never;

export type ClientEvents<K extends ClientNames> =
  "events" extends keyof ClientSchemas[K]
    ? ClientSchemas[K]["events"] extends ClientEventsType<K & string>
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

type ScopeStates = {
  [K in ClientNames]: ClientSchemas[K]["methods"] extends {
    getState: () => infer S;
  }
    ? S
    : never;
};

/**
 * State type extracted from all clients via their getState() methods.
 *
 * `optional` exposes the same scopes, but an unavailable scope resolves to
 * `undefined` instead of throwing: `s.optional.threadListItem?.remoteId`.
 */
export type AssistantState = ScopeStates & {
  readonly optional: {
    readonly [K in keyof ScopeStates]: ScopeStates[K] | undefined;
  };
};

/**
 * A bound client accessor: the property IS the bound client instance, plus
 * `source`/`query`/`name` selection metadata. Calling it remains supported
 * for backwards compatibility.
 *
 * An unavailable scope's accessor has `source: null` and throws when any
 * other property is read or the accessor is called. The accessor itself is
 * always truthy — check availability via `aui.thread.source != null`.
 */
export type AssistantClientAccessor<K extends ClientNames> =
  ClientSchemas[K]["methods"] & {
    /** @deprecated Access the scope as a property instead: `aui.thread` in place of `aui.thread()`. */
    (): ClientSchemas[K]["methods"];
  } & (
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
