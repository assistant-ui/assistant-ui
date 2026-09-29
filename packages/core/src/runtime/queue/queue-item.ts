import type { FileMessagePart, TextMessagePart } from "../../types/message";

export type QueueItemState = {
  readonly id: string;
  /** @deprecated Derive from the text parts of `parts` instead. Removal after 2026-11-05. */
  readonly prompt: string;
  readonly parts: readonly (FileMessagePart | TextMessagePart)[];
};

export const EMPTY_QUEUE_ITEMS: readonly QueueItemState[] = Object.freeze([]);
