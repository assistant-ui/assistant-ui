"use client";

import {
  ActionButtonElement,
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useAui } from "@assistant-ui/store";
import { useCallback } from "react";

const useQueueItemRemove = () => {
  const aui = useAui();

  const callback = useCallback(() => {
    aui.queueItem().remove();
  }, [aui]);

  return callback;
};

export namespace QueueItemPrimitiveRemove {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useQueueItemRemove>;
}

/**
 * A button that removes this item from the queue.
 *
 * @example
 * ```tsx
 * <QueueItemPrimitive.Remove>×</QueueItemPrimitive.Remove>
 * ```
 */
export const QueueItemPrimitiveRemove = createActionButton(
  "QueueItemPrimitive.Remove",
  useQueueItemRemove,
);
