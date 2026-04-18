import { type FC, type ReactNode, memo, useMemo } from "react";
import { RenderChildrenWithAccessor, useAuiState } from "@assistant-ui/store";
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
  const queue = useAuiState((s) => s.composer.queue.length);

  return useMemo(
    () =>
      Array.from({ length: queue }, (_, index) => (
        <QueueItemByIndexProvider key={index} index={index}>
          <RenderChildrenWithAccessor
            getItemState={(aui) =>
              aui.composer().queueItem({ index }).getState()
            }
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
    [queue, children],
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
