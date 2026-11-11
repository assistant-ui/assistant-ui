"use client";

import {
  type ActionButtonElement,
  type ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useThreadRefreshRun as useThreadRefreshRunBehavior } from "@assistant-ui/core/react";

const useThreadRefreshRun = () => {
  const { disabled, refresh } = useThreadRefreshRunBehavior();
  if (disabled) return null;
  return refresh;
};

export namespace ThreadPrimitiveRefreshRun {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useThreadRefreshRun>;
}

/**
 * A button that re-reads a thread whose reply another tab or session is
 * generating, so it shows the stored state without a page reload. The thread
 * also re-reads on its own while the run goes on. It renders disabled unless
 * `useThreadReplyState()` reads `in-progress`, and while a refresh is in
 * flight.
 *
 * @example
 * ```tsx
 * <ThreadPrimitive.RefreshRun>Refresh</ThreadPrimitive.RefreshRun>
 * ```
 */
export const ThreadPrimitiveRefreshRun = createActionButton(
  "ThreadPrimitive.RefreshRun",
  useThreadRefreshRun,
);
