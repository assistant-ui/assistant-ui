"use client";

import type { FC, PropsWithChildren } from "react";
import { useAuiState } from "./useAuiState";
import type { AssistantState } from "./types/client";

export namespace AuiIf {
  /** Props for `AuiIf`. */
  export type Props = PropsWithChildren<{
    /** Selector deciding whether `children` render. */
    condition: AuiIf.Condition;
  }>;

  /** Boolean selector over the assistant state. */
  export type Condition = (state: AssistantState) => boolean;
}

/** Renders `children` while `condition` selects `true` from the assistant state. */
export const AuiIf: FC<AuiIf.Props> = ({ children, condition }) => {
  const result = useAuiState(condition);
  return result ? children : null;
};

AuiIf.displayName = "AuiIf";
