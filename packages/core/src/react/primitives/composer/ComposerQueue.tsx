import { type ReactNode, memo } from "react";
import { useAuiState } from "@assistant-ui/store";
import type { QueueItemState } from "../../../store/scopes/queue-item";
import { QueueItemByIndexProvider } from "../../providers/QueueItemByIndexProvider";
import { createIndexedItems } from "../utils/createIndexedItems";

export namespace ComposerPrimitiveQueue {
  export type Props = {
    /** Render function called for each queue item. Receives the queue item state. */
    children: (value: { queueItem: QueueItemState }) => ReactNode;
  };
}

const ComposerPrimitiveQueueInner = createIndexedItems({
  useLength: () => useAuiState((s) => s.composer.queue.length),
  Provider: QueueItemByIndexProvider,
  getItemState: (aui, index) => aui.composer.queueItem({ index }).getState(),
  getValue: (getItem): { queueItem: QueueItemState } => ({
    get queueItem() {
      return getItem();
    },
  }),
});

/**
 * Renders all queue items in the composer.
 *
 * @example
 * ```tsx
 * <ComposerPrimitive.Queue>
 *   {({ queueItem }) => (
 *     <div>
 *       <QueueItemPrimitive.Text />
 *       <QueueItemPrimitive.Steer>Run Now</QueueItemPrimitive.Steer>
 *     </div>
 *   )}
 * </ComposerPrimitive.Queue>
 * ```
 */
export const ComposerPrimitiveQueue = memo(ComposerPrimitiveQueueInner);

ComposerPrimitiveQueue.displayName = "ComposerPrimitive.Queue";
