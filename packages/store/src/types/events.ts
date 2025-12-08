import type { ClientSchemas, Unsubscribe } from "./client";
import type { ClientStack } from "../utils/tap-client-stack-context";

// --- Event Map Construction ---

type UnionToIntersection<U> = (
  U extends unknown
    ? (x: U) => void
    : never
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

type ParentOf<K extends keyof ClientSchemas> = ClientSchemas[K] extends {
  meta: { source: infer S };
}
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

// --- Event Manager Type ---

export type EventManager = {
  on<TEvent extends AssistantEvent>(
    event: TEvent,
    callback: (
      payload: AssistantEventMap[TEvent],
      clientStack: ClientStack,
    ) => void,
  ): Unsubscribe;
  emit<TEvent extends Exclude<AssistantEvent, "*">>(
    event: TEvent,
    payload: AssistantEventMap[TEvent],
    clientStack: ClientStack,
  ): void;
};
