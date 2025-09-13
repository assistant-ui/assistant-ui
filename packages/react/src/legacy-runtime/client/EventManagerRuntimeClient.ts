import { resource, tapMemo } from "@assistant-ui/tap";
import { Unsubscribe } from "../../types/Unsubscribe";
import {
  AssistantEventMap,
  AssistantEvent,
  AssistantEventCallback,
} from "../../types/EventTypes";

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
              callback({ event, payload });
            }
          }
        });
      },
    } satisfies EventManager;
  }, []);

  return events;
});
