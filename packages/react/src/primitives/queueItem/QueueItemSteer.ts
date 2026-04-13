"use client";

import {
  type ActionButtonElement,
  type ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useAui } from "@assistant-ui/store";
import { useCallback } from "react";

const useQueueItemSteer = () => {
  const aui = useAui();

  const callback = useCallback(() => {
    aui.queueItem().steer();
  }, [aui]);

  return callback;
};

export namespace QueueItemPrimitiveSteer {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useQueueItemSteer>;
}

/**
 * A button that steers the current run to process this queue item immediately.
 *
 * @example
 * ```tsx
 * <QueueItemPrimitive.Steer>Run Now</QueueItemPrimitive.Steer>
 * ```
 */
export const QueueItemPrimitiveSteer = createActionButton(
  "QueueItemPrimitive.Steer",
  useQueueItemSteer,
);
