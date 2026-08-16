import type { FileMessagePart, TextMessagePart } from "../../types/message";
import type { QueuePlacement } from "../../runtime/queue/external-thread-queue-adapter";

export type QueueItemState = {
  readonly id: string;
  /** @deprecated Derive from the text parts of `parts` instead. Removal after 2026-11-05. */
  readonly prompt: string;
  readonly parts: readonly (FileMessagePart | TextMessagePart)[];
};

export const EMPTY_QUEUE_ITEMS: readonly QueueItemState[] = Object.freeze([]);

export type QueueItemMethods = {
  getState(): QueueItemState;
  /** @deprecated Use `move({ lane: "steer", insertAfter: null })` instead. Removal after 2026-11-05. */
  steer(): void;
  move(placement: QueuePlacement): void;
  remove(): void;
};

export type QueueItemMeta = {
  source: "composer";
  query: { type: "index"; index: number } | { type: "id"; id: string };
};

export type QueueItemClientSchema = {
  methods: QueueItemMethods;
  meta: QueueItemMeta;
};
