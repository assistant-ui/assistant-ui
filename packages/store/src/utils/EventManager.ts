import { resource, tapMemo } from "@assistant-ui/tap";
import type { ClientStack } from "./tap-client-stack-context";
import type { EventManager as EventManagerType } from "../types/events";

type InternalCallback = (payload: unknown, clientStack: ClientStack) => void;

export const EventManager = resource(() => {
  return tapMemo(() => {
    const listeners = new Map<string, Set<InternalCallback>>();
    const wildcardListeners = new Set<InternalCallback>();
    const subscribers = new Set<() => void>();

    const events: EventManagerType = {
      on(event, callback) {
        const cb = callback as InternalCallback;
        if (event === "*") {
          wildcardListeners.add(cb);
          return () => wildcardListeners.delete(cb);
        }

        let set = listeners.get(event);
        if (!set) {
          set = new Set();
          listeners.set(event, set);
        }
        set.add(cb);

        return () => {
          set!.delete(cb);
          if (set!.size === 0) listeners.delete(event);
        };
      },

      emit(event, payload, clientStack) {
        const eventListeners = listeners.get(event);
        if (!eventListeners && wildcardListeners.size === 0) return;

        queueMicrotask(() => {
          if (eventListeners) {
            for (const cb of eventListeners) cb(payload, clientStack);
          }
          if (wildcardListeners.size > 0) {
            const wrapped = { event, payload };
            for (const cb of wildcardListeners) cb(wrapped, clientStack);
          }
        });
      },
    };

    return {
      events,
      subscribe: (callback: () => void) => {
        subscribers.add(callback);
        return () => subscribers.delete(callback);
      },
      notifySubscribers: () => {
        for (const cb of subscribers) cb();
      },
    };
  }, []);
});
