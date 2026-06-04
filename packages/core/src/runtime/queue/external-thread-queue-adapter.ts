import type { AppendMessage } from "../../types/message";
import type { QueueItemState } from "../../store/scopes/queue-item";

/**
 * The queue surface a runtime exposes so the composer can stay usable during a
 * run and render the pending messages.
 */
export type ExternalThreadQueueAdapter = {
  items: readonly QueueItemState[];
  enqueue: (message: AppendMessage, options: { steer: boolean }) => void;
  steer: (queueItemId: string) => void;
  remove: (queueItemId: string) => void;
  clear: (reason: "edit" | "reload" | "cancel-run") => void;
};
