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
              (callback as (payload: { event: typeof event; payload: typeof payload }) => void)({ event, payload });
            }
          }
        });
      },
    } satisfies EventManager;
  }, []);

  return events;
});

