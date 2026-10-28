import type { SessionStreamEvent } from "eve/client";

export type TurnTimestamps = {
  readonly user?: Date;
  readonly assistant?: Date;
};

export type TurnTimestampCache = {
  lastEvents: readonly SessionStreamEvent[];
  timestamps: ReadonlyMap<string, TurnTimestamps>;
};

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
