import { useState } from "react";
import type { ClientStack } from "./tap-client-stack-context";
import type {
  AssistantEventName,
  AssistantEventPayload,
} from "../types/events";
import type { Unsubscribe } from "../types/client";

type InternalCallback = (payload: unknown, clientStack: ClientStack) => unknown;

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

const reportListenerError = (error: unknown) => {
  console.error("NotificationManager: event listener error", error);
};

const invokeListener = (
  cb: InternalCallback,
  payload: unknown,
  clientStack: ClientStack,
) => {
  try {
    const result = cb(payload, clientStack);
    if (
      result !== null &&
      (typeof result === "object" || typeof result === "function") &&
      typeof (result as PromiseLike<unknown>).then === "function"
    ) {
      void Promise.resolve(result as PromiseLike<unknown>).catch(
        reportListenerError,
      );
    }
  } catch (e) {
    reportListenerError(e);
  }
};

export const createNotificationManager = (): NotificationManager => {
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
      if (!listeners.has(event) && wildcardListeners.size === 0) return;

      queueMicrotask(() => {
        // Resolved at flush time: a consumer that unsubscribed and resubscribed
        // since the emit lands in a fresh set, and the live-set contract says
        // the in-flight emission still reaches it
        const eventListeners = listeners.get(event);
        if (eventListeners) {
          for (const cb of eventListeners) {
            invokeListener(cb, payload, clientStack);
          }
        }
        if (wildcardListeners.size > 0) {
          const wrapped = { event, payload };
          for (const cb of wildcardListeners) {
            invokeListener(cb, wrapped, clientStack);
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
};

export const useNotificationManager = (): NotificationManager => {
  return useState(createNotificationManager)[0];
};
