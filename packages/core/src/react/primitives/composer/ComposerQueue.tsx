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
  const queueLength = useAuiState((s) => s.composer.queue.length);

  return useMemo(
    () =>
      queueLength === 0
        ? null
        : Array.from({ length: queueLength }, (_, index) => (
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
    [queueLength, children],
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
export const ComposerPrimitiveQueue = memo(
  ComposerPrimitiveQueueInner,
  (prev, next) => prev.children === next.children,
);

ComposerPrimitiveQueue.displayName = "ComposerPrimitive.Queue";
