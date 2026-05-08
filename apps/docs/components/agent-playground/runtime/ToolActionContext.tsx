import { createContext, useContext } from "react";
import type { ApprovalDecision } from "./assistantTypes";

export type ToolActionContextValue = {
  approveTool: (
    approvalId: string,
    decision: ApprovalDecision,
  ) => void | Promise<void>;
  respondToToolSuspension: (resumeData: unknown) => void | Promise<void>;
  respondToQuestion: (
    questionId: string,
    answer: string,
  ) => void | Promise<void>;
};

const noop = async () => {};

const ToolActionContext = createContext<ToolActionContextValue>({
  approveTool: noop,
  respondToToolSuspension: noop,
  respondToQuestion: noop,
});

export function ToolActionProvider({
  value,
  children,
}: {
  value: ToolActionContextValue;
  children: React.ReactNode;
}) {
  return (
    <ToolActionContext.Provider value={value}>
      {children}
    </ToolActionContext.Provider>
  );
}

export function useToolActions() {
  return useContext(ToolActionContext);
}
