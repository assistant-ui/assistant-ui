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
  /**
   * Installed by the owning runtime, applied to a message as it leaves a lane.
   * A message can wait through an entire run, so state the runtime attaches at
   * send time is recomputed against the thread it actually lands on. Adapters
   * from `createMessageQueue` provide this; a hand-rolled adapter that omits
   * it dispatches whatever was enqueued.
   */
  __internal_setDispatchTransform?:
    | ((transform: (message: AppendMessage) => AppendMessage) => void)
    | undefined;
};
