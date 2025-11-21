import { resource, tapMemo } from "@assistant-ui/tap";
import type { Unsubscribe } from "./types";

/**
 * Module augmentation interface for custom events.
 *
 * @example
 * ```typescript
 * declare module "@assistant-ui/store" {
 *   interface AssistantEventRegistry {
 *     "thread.run-start": { threadId: string };
 *     "custom.my-event": { data: string };
 *   }
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface AssistantEventRegistry {}

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
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface AssistantEventScopeConfig {}

export type AssistantEventMap = AssistantEventRegistry & {
  // Catch-all
  "*": {
    [K in Exclude<keyof AssistantEventRegistry, "*">]: {
      event: K;
      payload: AssistantEventRegistry[K];
    };
  }[Exclude<keyof AssistantEventRegistry, "*">];
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
              (
                callback as (payload: {
                  event: typeof event;
                  payload: typeof payload;
                }) => void
              )({ event, payload });
            }
          }
        });
      },
    } satisfies EventManager;
  }, []);

  return events;
});
