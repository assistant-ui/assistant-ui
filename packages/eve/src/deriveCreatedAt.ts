import type { EveMessageData } from "eve/react";
import type { HandleMessageStreamEvent } from "eve/client";

// A turn carries both of its messages, so each role takes the earliest event
// that belongs to it rather than the turn's first event: `message.received`
// stamps the user message, and the first event after it stamps the assistant
// message. Collapsing both onto the turn's start would render a reply that
// arrived after minutes of tool calls at the time the question was asked.
export type TurnTimestamps = {
  turn: Date;
  user?: Date;
  assistant?: Date;
};

export type TurnTimestampCache = {
  lastEvents: readonly HandleMessageStreamEvent[];
  timestamps: ReadonlyMap<string, TurnTimestamps>;
};

export type AssignedCreatedAt = { at: Date; durable: boolean };

const EMPTY_TURN_TIMESTAMPS: ReadonlyMap<string, TurnTimestamps> = new Map();

export const createTurnTimestampCache = (): TurnTimestampCache => ({
  lastEvents: [],
  timestamps: EMPTY_TURN_TIMESTAMPS,
});

// A turn whose event window no longer reaches its own role-specific events
// still resolves through the turn's earliest event, and an assistant message
// never resolves earlier than its user message.
const resolveTurnTimestamp = (
  stamps: TurnTimestamps | undefined,
  role: string,
): Date | undefined => {
  if (stamps === undefined) return undefined;
  if (role === "user") return stamps.user ?? stamps.turn;
  return stamps.assistant ?? stamps.user ?? stamps.turn;
};

// Eve grows its event log via [...events, event], so a later snapshot shares
// its prefix by reference and the scan can resume where it left off. The reuse
// is validated rather than trusted, because the cache may hold state from a
// discarded render. The whole prefix is compared: a boundary-only check accepts
// a snapshot that replaced an earlier event while keeping a later one, and the
// timestamp derived from the replaced event would survive unscanned.
//
// The map is copied on write and returned by identity, so a scan that learns
// nothing new lets callers keep memoized work alive.
export const collectTurnTimestamps = (
  events: readonly HandleMessageStreamEvent[],
  cache: TurnTimestampCache,
): ReadonlyMap<string, TurnTimestamps> => {
  if (events === cache.lastEvents) return cache.timestamps;

  const scanned = cache.lastEvents;
  const prefixIntact =
    events.length >= scanned.length &&
    scanned.every((event, index) => event === events[index]);

  let timestamps = prefixIntact ? cache.timestamps : EMPTY_TURN_TIMESTAMPS;
  let draft: Map<string, TurnTimestamps> | undefined;
  for (let i = prefixIntact ? scanned.length : 0; i < events.length; i++) {
    const event = events[i]!;
    const at = event.meta?.at;
    if (at === undefined) continue;
    if (!("data" in event)) continue;
    if (!("turnId" in event.data) || typeof event.data.turnId !== "string")
      continue;
    const turnId = event.data.turnId;
    const known = timestamps.get(turnId);
    const isReceived = event.type === "message.received";
    const wantsUser = isReceived && known?.user === undefined;
    const wantsAssistant =
      !isReceived && known?.user !== undefined && known.assistant === undefined;
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
  return timestamps;
};

/**
 * Assigns every message a `createdAt`, and remembers what it assigned.
 *
 * Durable timestamps are ground truth and are never adjusted. Fallback
 * wall-clock stamps can run ahead of durable ones (a server clock behind the
 * client's), so each fallback is bounded between its neighboring
 * assigned/durable timestamps to keep message order and thread timestamps
 * consistent. The bounds are the tightest ones the thread order proves, so a
 * fallback with no durable predecessor renders at its successor's durable
 * stamp: an upper bound the message is no newer than, not a claim about when it
 * was sent. Leaving it unbounded means core's plain `new Date()`, which renders
 * resumed history as "just now" and orders it after the durable message that
 * follows it.
 *
 * A durable timestamp already observed for a still-present message outlives the
 * event that carried it: the event log can be replaced by one that no longer
 * reaches back to that turn (a resumed or compacted session), and re-deriving
 * from the new log alone would drop the message to a fresh wall-clock stamp and
 * render an old message as "just now".
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
