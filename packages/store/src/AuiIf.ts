"use client";

import type { FC, PropsWithChildren } from "react";
import { useAuiState } from "./useAuiState";
import type { AssistantState } from "./types/client";

export namespace AuiIf {
  /** Props for `AuiIf`. */
  export type Props = PropsWithChildren<{
    /**
     * Selector that decides whether to render `children`. Children render
     * when this returns truthy and unmount when it becomes falsy.
     */
    condition: AuiIf.Condition;
  }>;

  /**
   * Selector passed to `AuiIf`. Receives the assistant state and must
   * return a boolean.
   */
  export type Condition = (state: AssistantState) => boolean;
}

/**
 * Conditionally renders children based on a slice of assistant state.
 *
 * A thin wrapper around {@link useAuiState} that renders its children
 * when `condition` returns truthy and unmounts them when it returns
 * falsy. Keeps render logic declarative without mounting unused subtrees.
 *
 * @example
 * ```tsx
 * <AuiIf condition={(s) => s.thread.isRunning}>
 *   <CancelButton />
 * </AuiIf>
 * ```
 *
 * @example
 * ```tsx
 * <AuiIf condition={(s) => s.thread.messages.length === 0}>
 *   <EmptyState />
 * </AuiIf>
 * ```
 */
export const AuiIf: FC<AuiIf.Props> = ({ children, condition }) => {
  const result = useAuiState(condition);
  return result ? children : null;
};

AuiIf.displayName = "AuiIf";
