import type { MessageStreamEvent } from "eve/client";

export type TurnTimestamps = {
  readonly user?: Date;
  readonly assistant?: Date;
};

export type TurnTimestampCache = {
  lastEvents: readonly MessageStreamEvent[];
  timestamps: ReadonlyMap<string, TurnTimestamps>;
};

/**
 * The reducer cases eve projects into a message: `message.received` creates
 * `${turnId}:user`, and every assistant entry reaches `updateAssistantMessage`,
 * which creates `${turnId}:assistant` for a turn that has none. It enumerates
 * that reducer across the `>=0.32.0` peer range rather than stating a rule
 * about turn ids, because `turn.started` and the compaction events carry one
 * before the model runs. An event eve adds to the creating set later is absent
 * here and falls back to the wall clock instead of stamping a wrong time.
 */
const ROLE_BY_EVENT_TYPE: Partial<
  Record<MessageStreamEvent["type"], keyof TurnTimestamps>
> = {
  "message.received": "user",
  "step.started": "assistant",
  "reasoning.appended": "assistant",
  "reasoning.completed": "assistant",
  "action.input.appended": "assistant",
  "actions.requested": "assistant",
  "input.requested": "assistant",
  "action.result": "assistant",
  "action.partial": "assistant",
  "authorization.required": "assistant",
  "authorization.completed": "assistant",
  "message.appended": "assistant",
  "message.completed": "assistant",
  "result.completed": "assistant",
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
