import type { AppendMessage } from "../../types/message";
import type { QueueItemState } from "./queue-item";

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
   * Used for unbound items and as the fallback for a disposed item's runtime.
   * `createMessageQueue` binds a runtime's transform to its queued item so
   * state is recomputed against that runtime's thread when the item leaves a
   * lane. A hand-rolled adapter that omits this dispatches whatever was
   * enqueued.
   */
  __internal_setDispatchTransform?:
    | ((transform: (message: AppendMessage) => AppendMessage) => void)
    | undefined;
  /**
   * Called by the owning runtime when the user cancels the run, before the run
   * is aborted. Pauses the queue so the cancelled run's settle keeps the
   * pending items instead of dispatching the next one; the next send re-arms
   * draining. A hand-rolled adapter that omits it drains on cancel.
   */
  __internal_notifyCancelled?: (() => void) | undefined;
};
