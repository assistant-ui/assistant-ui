import { resource } from "@assistant-ui/tap";
import type { ClientStack } from "./tap-client-stack-context";
import type {
  AssistantEventName,
  AssistantEventPayload,
} from "../types/events";
import { Unsubscribe } from "../types/client";
import { tapConst } from "@assistant-ui/tap";

type InternalCallback = (payload: unknown, clientStack: ClientStack) => void;

export type NotificationManager = {
  on<TEvent extends AssistantEventName>(
    event: TEvent,
    callback: (
      payload: AssistantEventPayload[TEvent],
      clientStack: ClientStack,
    ) => void,
  ): Unsubscribe;
  emit<TEvent extends Exclude<AssistantEventName, "*">>(
    event: TEvent,
    payload: AssistantEventPayload[TEvent],
    clientStack: ClientStack,
  ): void;
  subscribe(callback: () => void): Unsubscribe;
  notifySubscribers(): void;
};

export const NotificationManager = resource((): NotificationManager => {
  return tapConst(() => {
    const listeners = new Map<string, Set<InternalCallback>>();
    const wildcardListeners = new Set<InternalCallback>();
    const subscribers = new Set<() => void>();

    return {
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
          const errors = [];
          if (eventListeners) {
            for (const cb of eventListeners) {
              try {
                cb(payload, clientStack);
              } catch (e) {
                errors.push(e);
              }
            }
          }
          if (wildcardListeners.size > 0) {
            const wrapped = { event, payload };
            for (const cb of wildcardListeners) {
              try {
                cb(wrapped, clientStack);
              } catch (e) {
                errors.push(e);
              }
            }
          }

          if (errors.length > 0) {
            if (errors.length === 1) {
              throw errors[0];
            } else {
              for (const error of errors) {
                console.error(error);
              }
              throw new AggregateError(
                errors,
                "Errors occurred during event emission",
              );
            }
          }
        });
      },

      subscribe(callback) {
        subscribers.add(callback);
        return () => subscribers.delete(callback);
      },

      notifySubscribers() {
        for (const cb of subscribers) {
          try {
            cb();
          } catch (e) {
            console.error("NotificationManager: subscriber callback error", e);
          }
        }
      },
    };
  }, []);
});
