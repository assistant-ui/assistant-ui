import type { EveMessageData } from "eve/react";
import type { HandleMessageStreamEvent } from "eve/client";

// One eve turn carries both of its messages, so a single turn timestamp would
// render a reply that arrived after minutes of tool calls at the time the
// question was asked.
export type TurnTimestamps = {
  turn: Date;
  user?: Date;
  assistant?: Date;
};

export type TurnTimestampCache = {
  lastEvents: readonly HandleMessageStreamEvent[];
  timestamps: ReadonlyMap<string, TurnTimestamps>;
  receivedTurns: Set<string>;
};

export type AssignedCreatedAt = { at: Date; durable: boolean };

const EMPTY_TURN_TIMESTAMPS: ReadonlyMap<string, TurnTimestamps> = new Map();

export const createTurnTimestampCache = (): TurnTimestampCache => ({
  lastEvents: [],
  timestamps: EMPTY_TURN_TIMESTAMPS,
  receivedTurns: new Set(),
});

const resolveTurnTimestamp = (
  stamps: TurnTimestamps | undefined,
  role: string,
): Date | undefined => {
  if (stamps === undefined) return undefined;
  if (role === "user") return stamps.user ?? stamps.turn;
  return stamps.assistant ?? stamps.user ?? stamps.turn;
};

const sharesPrefix = (
  prefix: readonly HandleMessageStreamEvent[],
  events: readonly HandleMessageStreamEvent[],
): boolean => {
  if (events.length < prefix.length) return false;
  for (let i = 0; i < prefix.length; i++)
    if (prefix[i] !== events[i]) return false;
  return true;
};

// Eve grows its event log via [...events, event], so a later snapshot shares
// its prefix by reference and the scan can resume where it left off.
export const collectTurnTimestamps = (
  events: readonly HandleMessageStreamEvent[],
  cache: TurnTimestampCache,
): ReadonlyMap<string, TurnTimestamps> => {
  if (events === cache.lastEvents) return cache.timestamps;

  const scanned = cache.lastEvents;
  const prefixIntact = sharesPrefix(scanned, events);

  let timestamps = prefixIntact ? cache.timestamps : EMPTY_TURN_TIMESTAMPS;
  const receivedTurns = prefixIntact ? cache.receivedTurns : new Set<string>();
  let draft: Map<string, TurnTimestamps> | undefined;
  for (let i = prefixIntact ? scanned.length : 0; i < events.length; i++) {
    const event = events[i]!;
    if (!("data" in event)) continue;
    if (!("turnId" in event.data) || typeof event.data.turnId !== "string")
      continue;
    const turnId = event.data.turnId;
    const isReceived = event.type === "message.received";
    // The receipt marks where the assistant's own events begin whether or not
    // it carries a usable timestamp of its own.
    if (isReceived) receivedTurns.add(turnId);
    const at = event.meta?.at;
    if (at === undefined) continue;
    const known = timestamps.get(turnId);
    const wantsUser = isReceived && known?.user === undefined;
    const wantsAssistant =
      !isReceived &&
      receivedTurns.has(turnId) &&
      known?.assistant === undefined;
    if (known !== undefined && !wantsUser && !wantsAssistant) continue;
    const date = new Date(at);
    if (Number.isNaN(date.getTime())) continue;
    const next: TurnTimestamps = { ...(known ?? { turn: date }) };
    if (wantsUser) next.user = date;
    if (wantsAssistant) next.assistant = date;
    draft ??= new Map(timestamps);
    draft.set(turnId, next);
    timestamps = draft;
  }

  cache.lastEvents = events;
  cache.timestamps = timestamps;
  cache.receivedTurns = receivedTurns;
  return timestamps;
};

/**
 * Assigns every message a `createdAt`, and remembers what it assigned.
 *
 * A message eve has no durable stamp for (an optimistic or failed send) takes a
 * client wall clock that can run ahead of the server's, so each fallback is
 * bounded by its neighboring durable stamps to keep the thread in order.
 *
 * A durable stamp already observed for a still-present message outlives the
 * event that carried it, so a replaced event log cannot drop an old message
 * back to a fresh wall clock and render it as "just now".
 */
export const assignCreatedAt = (
  messages: EveMessageData["messages"],
  turnTimestamps: ReadonlyMap<string, TurnTimestamps>,
  remembered: Map<string, AssignedCreatedAt>,
  now: () => Date = () => new Date(),
): ReadonlyMap<string, Date> => {
  const messageIds = new Set(messages.map((message) => message.id));
  for (const messageId of remembered.keys()) {
    if (!messageIds.has(messageId)) remembered.delete(messageId);
  }

  const durableByIndex = messages.map((message) => {
    const turnId = message.metadata?.turnId;
    const derived =
      turnId !== undefined
        ? resolveTurnTimestamp(turnTimestamps.get(turnId), message.role)
        : undefined;
    if (derived !== undefined) {
      remembered.set(message.id, { at: derived, durable: true });
      return derived;
    }
    const previous = remembered.get(message.id);
    return previous?.durable === true ? previous.at : undefined;
  });

  const nextDurableMsByIndex: (number | undefined)[] = [];
  let nextDurableMs: number | undefined;
  for (let i = messages.length - 1; i >= 0; i--) {
    nextDurableMsByIndex[i] = nextDurableMs;
    const durable = durableByIndex[i];
    if (durable !== undefined) nextDurableMs = durable.getTime();
  }

  const assignedById = new Map<string, Date>();
  let previousAssignedMs: number | undefined;
  messages.forEach((message, index) => {
    let assigned = durableByIndex[index];
    if (assigned === undefined) {
      let fallback = remembered.get(message.id)?.at;
      if (fallback === undefined) {
        fallback = now();
        remembered.set(message.id, { at: fallback, durable: false });
      }
      let ms = fallback.getTime();
      if (previousAssignedMs !== undefined && ms < previousAssignedMs)
        ms = previousAssignedMs;
      const nextMs = nextDurableMsByIndex[index];
      if (nextMs !== undefined && ms > nextMs) ms = nextMs;
      assigned = ms === fallback.getTime() ? fallback : new Date(ms);
    }
    previousAssignedMs = assigned.getTime();
    assignedById.set(message.id, assigned);
  });

  return assignedById;
};
