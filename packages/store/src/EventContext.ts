import { resource, tapMemo } from "@assistant-ui/tap";
import type { ClientSchemas, Unsubscribe } from "./types";
import type { ClientStack } from "./ClientStackContext";

type UnionToIntersection<U> = (
  U extends unknown
    ? (x: U) => void
    : never
) extends (x: infer I) => void
  ? I
  : never;

/**
 * Event map derived from client event definitions.
 */
type RawClientEventMap = UnionToIntersection<
  {
    [K in keyof ClientSchemas]: ClientSchemas[K] extends {
      events: infer E;
    }
      ? E extends Record<string, unknown>
        ? E
        : never
      : never;
  }[keyof ClientSchemas]
>;

// Fallback to empty object if no events are defined
export type ClientEventMap = [RawClientEventMap] extends [never]
  ? {}
  : RawClientEventMap;

// When no events defined, use `unknown` so callbacks can still be called
type WildcardPayload = [keyof ClientEventMap] extends [never]
  ? unknown
  : {
      [K in keyof ClientEventMap]: {
        event: K;
        payload: ClientEventMap[K];
      };
    }[keyof ClientEventMap];

export type AssistantEventMap = ClientEventMap & {
  "*": WildcardPayload;
};

export type AssistantEvent = keyof AssistantEventMap;

export type EventSource<T extends AssistantEvent = AssistantEvent> =
  T extends `${infer Source}.${string}` ? Source : never;

// Extract the source (parent) from a client's meta
type SourceOf<K extends keyof ClientSchemas> =
  ClientSchemas[K] extends { meta: { source: infer S } }
    ? S extends keyof ClientSchemas
      ? S
      : never
    : never;

// Recursively get all ancestors of a client
type AncestorsOf<
  K extends keyof ClientSchemas,
  Seen extends keyof ClientSchemas = never,
> = K extends Seen
  ? never
  : SourceOf<K> extends never
    ? never
    : SourceOf<K> | AncestorsOf<SourceOf<K>, Seen | K>;

// Get all descendants of a client (clients that have this as an ancestor)
type DescendantsOf<K extends keyof ClientSchemas> = {
  [C in keyof ClientSchemas]: K extends AncestorsOf<C> ? C : never;
}[keyof ClientSchemas];

// Given a scope, which event sources does it receive?
export type SourceByScope<TScope extends AssistantEventScope<AssistantEvent>> =
  | (TScope extends "*" ? EventSource : never)
  | (TScope extends keyof ClientSchemas ? TScope : never)
  | (TScope extends keyof ClientSchemas ? DescendantsOf<TScope> : never);

// For an event, which scopes can listen to it?
export type AssistantEventScope<TEvent extends AssistantEvent> =
  | "*"
  | EventSource<TEvent>
  | (EventSource<TEvent> extends keyof ClientSchemas
      ? AncestorsOf<EventSource<TEvent>>
      : never);

export type AssistantEventSelector<TEvent extends AssistantEvent> =
  | TEvent
  | {
      scope: AssistantEventScope<TEvent>;
      event: TEvent;
    };

export const normalizeEventSelector = <TEvent extends AssistantEvent>(
  selector: AssistantEventSelector<TEvent>,
) => {
  if (typeof selector === "string") {
    const source = selector.split(".")[0] as AssistantEventScope<TEvent>;
    return {
      scope: source,
      event: selector,
    };
  }

  return {
    scope: selector.scope,
    event: selector.event,
  };
};

export const checkEventScope = <
  TEvent extends AssistantEvent,
  TExpectedScope extends AssistantEventScope<AssistantEvent>,
>(
  expectedScope: TExpectedScope,
  scope: AssistantEventScope<TEvent>,
  _event: TEvent,
): _event is Extract<TEvent, `${SourceByScope<TExpectedScope>}.${string}`> => {
  return scope === expectedScope;
};

export type AssistantEventCallback<TEvent extends AssistantEvent> = (
  payload: AssistantEventMap[TEvent],
) => void;

/**
 * Internal callback type that receives the client stack for filtering.
 */
type InternalEventCallback<TEvent extends AssistantEvent> = (
  payload: AssistantEventMap[TEvent],
  clientStack: ClientStack,
) => void;

export type EventManager = {
  on<TEvent extends AssistantEvent>(
    event: TEvent,
    callback: InternalEventCallback<TEvent>,
  ): Unsubscribe;
  emit<TEvent extends Exclude<AssistantEvent, "*">>(
    event: TEvent,
    payload: AssistantEventMap[TEvent],
    clientStack: ClientStack,
  ): void;
};

type ListenerMap = Omit<
  Map<AssistantEvent, Set<InternalEventCallback<AssistantEvent>>>,
  "get" | "set"
> & {
  get<TEvent extends AssistantEvent>(
    event: TEvent,
  ): Set<InternalEventCallback<TEvent>> | undefined;
  set<TEvent extends AssistantEvent>(
    event: TEvent,
    value: Set<InternalEventCallback<TEvent>>,
  ): void;
};

export const EventManager = resource(() => {
  const events = tapMemo(() => {
    const listeners: ListenerMap = new Map();
    const subscribers = new Set<() => void>();

    return {
      events: {
        on: (event, callback) => {
          if (!listeners.has(event)) {
            listeners.set(event, new Set());
          }

          const eventListeners = listeners.get(event)!;
          eventListeners.add(callback);

          return () => {
            eventListeners.delete(callback);
            if (eventListeners.size === 0) {
              listeners.delete(event);
            }
          };
        },

        emit: (event, payload, clientStack) => {
          const eventListeners = listeners.get(event);
          const wildcardListeners = listeners.get("*");

          if (!eventListeners && !wildcardListeners) return;

          // make sure state updates flush
          queueMicrotask(() => {
            // Emit to specific event listeners
            if (eventListeners) {
              for (const callback of eventListeners) {
                callback(payload, clientStack);
              }
            }

            // Emit to wildcard listeners
            if (wildcardListeners) {
              for (const callback of wildcardListeners) {
                callback({ event, payload } as any, clientStack);
              }
            }
          });
        },
      } satisfies EventManager,

      subscribe: (callback: () => void) => {
        subscribers.add(callback);
        return () => subscribers.delete(callback);
      },

      notifySubscribers: () => {
        for (const callback of subscribers) {
          callback();
        }
      },
    };
  }, []);

  return events;
});
