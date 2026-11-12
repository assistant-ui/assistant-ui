"use client";

import {
  type ActionButtonElement,
  type ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useActionBarRefreshRun as useActionBarRefreshRunBehavior } from "@assistant-ui/core/react";

const useActionBarRefreshRun = () => {
  const { disabled, refresh } = useActionBarRefreshRunBehavior();
  if (disabled) return null;
  return refresh;
};

export namespace ActionBarPrimitiveRefreshRun {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useActionBarRefreshRun>;
}

/**
 * A button that re-reads an assistant message whose run another tab or
 * session is still writing, so the thread shows its latest stored state
 * without a page reload. The thread also re-reads it on its own around the
 * moment the run would cross `staleAfter`. It renders disabled unless
 * Assistant Cloud reported the run in progress elsewhere, and while a
 * refresh is in flight.
 *
 * @example
 * ```tsx
 * <ActionBarPrimitive.RefreshRun>Refresh</ActionBarPrimitive.RefreshRun>
 * ```
 */
export const ActionBarPrimitiveRefreshRun = createActionButton(
  "ActionBarPrimitive.RefreshRun",
  useActionBarRefreshRun,
);
