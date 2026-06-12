/**
 * Queue item id scheme — `"<mode>:<index>"` — shared by the supervisor's
 * `PiQueuedMessage`s and the runtime's composer queue items, and parsed by UIs
 * (e.g. to style steering items differently from follow-ups).
 */

export type PiQueueMode = "steer" | "followUp";

export const piQueueItemId = (mode: PiQueueMode, index: number): string =>
  `${mode}:${index}`;

export const isPiSteerQueueItemId = (id: string): boolean =>
  id.startsWith("steer:");
