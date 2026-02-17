"use client";

import type { FC, PropsWithChildren } from "react";
import { useAuiState } from "./useAuiState";
import type { AssistantState } from "@assistant-ui/core/store";

export namespace AuiIf {
  export type Props = PropsWithChildren<{ condition: AuiIf.Condition }>;
  export type Condition = (state: AssistantState) => boolean;
}

export const AuiIf: FC<AuiIf.Props> = ({ children, condition }) => {
  const result = useAuiState(condition);
  return result ? children : null;
};

AuiIf.displayName = "AuiIf";
