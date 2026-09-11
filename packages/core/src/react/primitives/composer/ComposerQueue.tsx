import { type FC, type ReactNode, memo, useMemo } from "react";
import { RenderChildrenWithAccessor, useAuiState } from "@assistant-ui/store";
import { useShallowSelector } from "@assistant-ui/store/internal";
import type { QueueItemState } from "../../../store/scopes/queue-item";
import { QueueItemByIndexProvider } from "../../providers/QueueItemByIndexProvider";

export namespace ComposerPrimitiveQueue {
  export type Props = {
    /** Render function called for each queue item. Receives the queue item state. */
    children: (value: { queueItem: QueueItemState }) => ReactNode;
  };
}

const ComposerPrimitiveQueueInner: FC<{
  children: (value: { queueItem: QueueItemState }) => ReactNode;
}> = ({ children }) => {
  const queueItemIds = useAuiState(
    useShallowSelector((s) => s.composer.queue.map((item) => item.id)),
  );

  return useMemo(
    () =>
      queueItemIds.map((queueItemId, index) => (
        <QueueItemByIndexProvider key={queueItemId} index={index}>
          <RenderChildrenWithAccessor
            getItemState={(aui) => aui.composer.queueItem({ index }).getState()}
          >
            {(getItem) =>
              children({
                get queueItem() {
                  return getItem();
                },
              })
            }
          </RenderChildrenWithAccessor>
        </QueueItemByIndexProvider>
      )),
    [queueItemIds, children],
  );
};

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
