import { resource, tapMemo } from "@assistant-ui/tap";
import type { ClientSchemas, Unsubscribe } from "./types";
import type { ClientStack } from "./ClientStackContext";

// --- Event Map Construction ---

type UnionToIntersection<U> = (
  U extends unknown ? (x: U) => void : never
) extends (x: infer I) => void
  ? I
  : never;

type RawClientEventMap = UnionToIntersection<
  {
    [K in keyof ClientSchemas]: ClientSchemas[K] extends { events: infer E }
      ? E extends Record<string, unknown>
        ? E
        : never
      : never;
  }[keyof ClientSchemas]
>;

export type ClientEventMap = [RawClientEventMap] extends [never]
  ? {}
  : RawClientEventMap;

// --- Core Types ---

type WildcardPayload = [keyof ClientEventMap] extends [never]
  ? unknown
  : {
      [K in keyof ClientEventMap]: { event: K; payload: ClientEventMap[K] };
    }[keyof ClientEventMap];

export type AssistantEventMap = ClientEventMap & { "*": WildcardPayload };

export type AssistantEvent = keyof AssistantEventMap;

/** Extracts client name from event: `EventSource<"thread.updated">` = `"thread"` */
export type EventSource<T extends AssistantEvent = AssistantEvent> =
  T extends `${infer Source}.${string}` ? Source : never;

// --- Scoping ---

type ParentOf<K extends keyof ClientSchemas> =
  ClientSchemas[K] extends { meta: { source: infer S } }
    ? S extends keyof ClientSchemas
      ? S
      : never
    : never;

type AncestorsOf<
  K extends keyof ClientSchemas,
  Seen extends keyof ClientSchemas = never,
> = K extends Seen
  ? never
  : ParentOf<K> extends never
    ? never
    : ParentOf<K> | AncestorsOf<ParentOf<K>, Seen | K>;

/** Valid scopes: `"*"` | event source | ancestors of event source */
export type AssistantEventScope<TEvent extends AssistantEvent> =
  | "*"
  | EventSource<TEvent>
  | (EventSource<TEvent> extends keyof ClientSchemas
      ? AncestorsOf<EventSource<TEvent>>
      : never);

// --- Selection & Callbacks ---

export type AssistantEventSelector<TEvent extends AssistantEvent> =
  | TEvent
  | { scope: AssistantEventScope<TEvent>; event: TEvent };

export const normalizeEventSelector = <TEvent extends AssistantEvent>(
  selector: AssistantEventSelector<TEvent>,
) => {
  if (typeof selector === "string") {
    const source = selector.split(".")[0] as AssistantEventScope<TEvent>;
    return { scope: source, event: selector };
  }
  return { scope: selector.scope, event: selector.event };
};

export type AssistantEventCallback<TEvent extends AssistantEvent> = (
  payload: AssistantEventMap[TEvent],
) => void;

// --- Event Manager ---

type InternalCallback = (payload: unknown, clientStack: ClientStack) => void;

export type EventManager = {
  on<TEvent extends AssistantEvent>(
    event: TEvent,
    callback: (payload: AssistantEventMap[TEvent], clientStack: ClientStack) => void,
  ): Unsubscribe;
  emit<TEvent extends Exclude<AssistantEvent, "*">>(
    event: TEvent,
    payload: AssistantEventMap[TEvent],
    clientStack: ClientStack,
  ): void;
};

export const EventManager = resource(() => {
  return tapMemo(() => {
    const listeners = new Map<string, Set<InternalCallback>>();
    const wildcardListeners = new Set<InternalCallback>();
    const subscribers = new Set<() => void>();

    const events: EventManager = {
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
