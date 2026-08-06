import type { AppendMessage } from "../../types/message";
import type { QueueItemState } from "../../store/scopes/queue-item";

export type QueuePlacement = {
  readonly insertAfter?: string | null;
  readonly insertBefore?: string | null;
};

/**
 * The queue surface a runtime exposes so the composer can stay usable during a
 * run and render the pending messages.
 */
export type ExternalThreadQueueAdapter = {
  items: readonly QueueItemState[];
  steerItems: readonly QueueItemState[];
  enqueue: (
    message: AppendMessage,
    options: { lane: "queue" | "steer" },
  ) => void;
  move: (
    queueItemId: string,
    options: { lane?: "queue" | "steer" } & QueuePlacement,
  ) => void;
  edit: (queueItemId: string, message: AppendMessage) => void;
  remove: (queueItemId: string) => void;
};
