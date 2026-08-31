import type { MessageStreamEvent } from "eve/client";

export type TurnTimestamps = {
  readonly user?: Date;
  readonly assistant?: Date;
};

export type TurnTimestampCache = {
  lastEvents: readonly MessageStreamEvent[];
  timestamps: ReadonlyMap<string, TurnTimestamps>;
};

const ROLE_BY_EVENT_TYPE: Partial<
  Record<MessageStreamEvent["type"], keyof TurnTimestamps>
> = {
  "message.received": "user",
  "step.started": "assistant",
  "turn.completed": "assistant",
  "turn.cancelled": "assistant",
};

export const createTurnTimestampCache = (): TurnTimestampCache => ({
  lastEvents: [],
  timestamps: new Map(),
});

/**
 * Eve appends to its log (`[...events, event]`), so a snapshot that keeps the
 * previous scan's last element by identity shares the whole prefix and the
 * scan resumes there. Any other snapshot is re-derived into a fresh map: turn
 * ids are per-session sequence numbers that recur after `reset()`, so entries
 * must not outlive the log that produced them. Re-derivation is also what
 * makes the render-phase cache writes safe when React discards a render.
 */
export const collectTurnTimestamps = (
  events: readonly MessageStreamEvent[],
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
    const role = ROLE_BY_EVENT_TYPE[event.type];
    if (role === undefined) continue;
    const data: unknown = (event as { readonly data?: unknown }).data;
    if (typeof data !== "object" || data === null) continue;
    const turnId = (data as { readonly turnId?: unknown }).turnId;
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
