import type { AppendMessage } from "../../types/message";
import type { QueueItemState } from "../../store/scopes/queue-item";

export type QueuePlacement = {
  readonly lane?: "queue" | "steer";
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
  /** Send a message into the queue lane, processed in order. */
  enqueue: (message: AppendMessage) => void;
  /** Send a message into the steer lane, processed next. */
  steer: (message: AppendMessage) => void;
  /**
   * Move a queued message between lanes or within a lane. An unanchored move
   * into the steer lane mid-run interrupts — cancels the live run and
   * dispatches the item — when the runtime supports cancellation; a move with
   * `insertAfter`/`insertBefore` only places the item and never interrupts.
   */
  move: (queueItemId: string, placement: QueuePlacement) => void;
  edit: (queueItemId: string, message: AppendMessage) => void;
  remove: (queueItemId: string) => void;
};
