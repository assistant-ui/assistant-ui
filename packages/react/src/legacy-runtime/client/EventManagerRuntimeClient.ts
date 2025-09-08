import { resource, tapState } from "@assistant-ui/tap";
import { tapApi } from "../../utils/tap-store";
import { AssistantEvents, Unsubscribe } from "../../types";

type EventCallback<TEvent extends keyof AssistantEvents> = (
  payload: AssistantEvents[TEvent],
) => void;

export type EventManagerActions = {
  on<TEvent extends keyof AssistantEvents>(
    event: TEvent,
    callback: EventCallback<TEvent>,
  ): Unsubscribe;
  emit<TEvent extends keyof AssistantEvents>(
    event: TEvent,
    payload: AssistantEvents[TEvent],
  ): void;
};

export const EventManagerClient = resource(() => {
  // Map of event name to set of callbacks
  const [listeners] = tapState<Map<string, Set<EventCallback<any>>>>(
    () => new Map(),
  );

  const api = tapApi<Record<string, never>, EventManagerActions>(
    {},
    {
      on: <TEvent extends keyof AssistantEvents>(
        event: TEvent,
        callback: EventCallback<TEvent>,
      ): Unsubscribe => {
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

      emit: (event: keyof AssistantEvents, payload: any) => {
        const eventListeners = listeners.get(event);
        if (!eventListeners) return;

        // make sure state updates flush
        queueMicrotask(() => {
          for (const callback of eventListeners) {
            callback(payload);
          }
        });
      },
    },
  );

  return api;
});
