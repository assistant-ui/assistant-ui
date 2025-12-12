"use client";

import type { FC, PropsWithChildren } from "react";
import { useAssistantState } from "./useAssistantState";
import type { AssistantState } from "./types/client";

export namespace AssistantIf {
  export type Props = PropsWithChildren<{ condition: AssistantIf.Condition }>;
  export type Condition = (state: AssistantState) => boolean;
}

export const AssistantIf: FC<AssistantIf.Props> = ({ children, condition }) => {
  const result = useAssistantState(condition);
  return result ? children : null;
};

AssistantIf.displayName = "AssistantIf";
