import type { SessionStreamEvent } from "eve/client";

export type TurnTimestamps = {
  readonly user?: Date;
  readonly assistant?: Date;
};

export type TurnTimestampCache = {
  lastEvents: readonly SessionStreamEvent[];
  timestamps: ReadonlyMap<string, TurnTimestamps>;
};

/**
 * The facts eve projects into a message: a `delivery.consumed` carrying parts
 * opens the turn's user message, and the model, content, call, and interaction
 * facts open its assistant message. A fact eve adds to the creating set later
 * is absent here and falls back to the wall clock instead of stamping a wrong
 * time.
 */
const ROLE_BY_EVENT_TYPE: Partial<
  Record<SessionStreamEvent["type"], keyof TurnTimestamps>
> = {
  "delivery.consumed": "user",
  "model.requested": "assistant",
  "model.started": "assistant",
  "content.delta": "assistant",
  "content.completed": "assistant",
  "call.input": "assistant",
  "call.requested": "assistant",
  "call.started": "assistant",
  "call.settled": "assistant",
  "call.progress": "assistant",
  "interaction.opened": "assistant",
};

export const createTurnTimestampCache = (): TurnTimestampCache => ({
  lastEvents: [],
  timestamps: new Map(),
});

/**
 * Eve appends to its log, so a snapshot that keeps the previous scan's last
 * element by identity shares the whole prefix and the scan resumes there. Any
 * other snapshot is re-derived into a fresh map: turn ids are per-session
 * sequence numbers that recur after `newSession()`, so entries must not
 * outlive the log that produced them. Re-derivation is also what makes the
 * render-phase cache writes safe when React discards a render.
 */
export const collectTurnTimestamps = (
  events: readonly SessionStreamEvent[],
  cache: TurnTimestampCache,
): ReadonlyMap<string, TurnTimestamps> => {
  if (events === cache.lastEvents) return cache.timestamps;

  const scanned = cache.lastEvents;
  const resumesScan =
    scanned.length === 0 ||
    events[scanned.length - 1] === scanned[scanned.length - 1];

  let timestamps = cache.timestamps;
  let draft: Map<string, TurnTimestamps> | undefined;
  if (!resumesScan) {
    draft = new Map();
    timestamps = draft;
  }
  for (let i = resumesScan ? scanned.length : 0; i < events.length; i++) {
    const event = events[i]!;
    // `type` arrives off the wire, so an inherited member such as
    // `__proto__` would resolve here instead of missing, and be used as a
    // timestamp key. Only the table's own entries count.
    if (!Object.prototype.hasOwnProperty.call(ROLE_BY_EVENT_TYPE, event.type))
      continue;
    const role = ROLE_BY_EVENT_TYPE[event.type];
    if (role === undefined) continue;
    const turnId =
      event.type === "delivery.consumed"
        ? event.data.turnId
        : event.scope?.turnId;
    if (event.type === "delivery.consumed" && event.data.parts.length === 0)
      continue;
    if (typeof turnId !== "string") continue;
    const known = timestamps.get(turnId);
    if (known?.[role] !== undefined) continue;
    const at: unknown = (event as { readonly meta?: { readonly at?: unknown } })
      .meta?.at;
    if (typeof at !== "string") continue;
    const date = new Date(at);
    if (Number.isNaN(date.getTime())) continue;
    draft ??= new Map(timestamps);
    draft.set(turnId, { ...known, [role]: date });
    timestamps = draft;
  }

  cache.lastEvents = events;
  cache.timestamps = timestamps;
  return timestamps;
};
