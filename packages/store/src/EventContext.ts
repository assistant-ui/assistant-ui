import { resource, tapMemo } from "@assistant-ui/tap";
import type { AssistantScopes, Unsubscribe } from "./types";

/**
 * Module augmentation interface for event scope configuration.
 * Maps event sources to their parent scopes.
 *
 * @example
 * ```typescript
 * declare module "@assistant-ui/store" {
 *   interface AssistantEventScopeConfig {
 *     composer: "thread" | "message";
 *     thread: never;
 *   }
 * }
 * ```
 */
export interface AssistantEventScopeConfig {}

type UnionToIntersection<U> = (
  U extends unknown
    ? (x: U) => void
    : never
) extends (x: infer I) => void
  ? I
  : never;

/**
 * Event map derived from scope event definitions
 */
type RawScopeEventMap = UnionToIntersection<
  {
    [K in keyof AssistantScopes]: AssistantScopes[K] extends {
      events: infer E;
    }
      ? E extends Record<string, unknown>
        ? E
        : never
      : never;
  }[keyof AssistantScopes]
>;

// Fallback to empty object if no events are defined
export type ScopeEventMap = [RawScopeEventMap] extends [never]
  ? {}
  : RawScopeEventMap;

// When no events defined, use `unknown` so callbacks can still be called
type WildcardPayload = [keyof ScopeEventMap] extends [never]
  ? unknown
  : {
      [K in keyof ScopeEventMap]: {
        event: K;
        payload: ScopeEventMap[K];
      };
    }[keyof ScopeEventMap];

export type AssistantEventMap = ScopeEventMap & {
  // Catch-all
  "*": WildcardPayload;
};

export type AssistantEvent = keyof AssistantEventMap;

export type EventSource<T extends AssistantEvent = AssistantEvent> =
  T extends `${infer Source}.${string}` ? Source : never;

export type SourceByScope<TScope extends AssistantEventScope<AssistantEvent>> =
  | (TScope extends "*" ? EventSource : never)
  | (TScope extends keyof AssistantEventScopeConfig ? TScope : never)
  | {
      [K in keyof AssistantEventScopeConfig]: TScope extends AssistantEventScopeConfig[K]
        ? K
        : never;
    }[keyof AssistantEventScopeConfig];

export type AssistantEventScope<TEvent extends AssistantEvent> =
  | "*"
  | EventSource<TEvent>
  | (EventSource<TEvent> extends keyof AssistantEventScopeConfig
      ? AssistantEventScopeConfig[EventSource<TEvent>]
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

export type EventManager = {
  on<TEvent extends AssistantEvent>(
    event: TEvent,
    callback: AssistantEventCallback<TEvent>,
  ): Unsubscribe;
  emit<TEvent extends Exclude<AssistantEvent, "*">>(
    event: TEvent,
    payload: AssistantEventMap[TEvent],
  ): void;
};

type ListenerMap = Omit<
  Map<AssistantEvent, Set<AssistantEventCallback<AssistantEvent>>>,
  "get" | "set"
> & {
  get<TEvent extends AssistantEvent>(
    event: TEvent,
  ): Set<AssistantEventCallback<TEvent>> | undefined;
  set<TEvent extends AssistantEvent>(
    event: TEvent,
    value: Set<AssistantEventCallback<TEvent>>,
  ): void;
};

export const EventManager = resource(() => {
  const events = tapMemo(() => {
    const listeners: ListenerMap = new Map();

    return {
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

      emit: (event, payload) => {
        const eventListeners = listeners.get(event);
        const wildcardListeners = listeners.get("*");

        if (!eventListeners && !wildcardListeners) return;

        // make sure state updates flush
        queueMicrotask(() => {
          // Emit to specific event listeners
          if (eventListeners) {
            for (const callback of eventListeners) {
              callback(payload);
            }
          }

          // Emit to wildcard listeners
          if (wildcardListeners) {
            for (const callback of wildcardListeners) {
              callback({ event, payload } as any);
            }
          }
        });
      },
    } satisfies EventManager;
  }, []);

  return events;
});
