"use client";

import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { ApprovalRuntime, ApprovalState } from "../runtime";
import { useTask } from "./useTaskState";

const ApprovalContext = createContext<string | null>(null);

export interface ApprovalProviderProps {
  approvalId: string;
  children: ReactNode;
}

export function ApprovalProvider({
  approvalId,
  children,
}: ApprovalProviderProps) {
  return (
    <ApprovalContext.Provider value={approvalId}>
      {children}
    </ApprovalContext.Provider>
  );
}

export function useApprovalId(): string {
  const approvalId = useContext(ApprovalContext);
  if (!approvalId) {
    throw new Error("useApprovalId must be used within an ApprovalProvider");
  }
  return approvalId;
}

export function useApproval(): ApprovalRuntime {
  const task = useTask();
  const approvalId = useApprovalId();
  const approval = task.getApproval(approvalId);
  if (!approval) {
    throw new Error(`Approval not found: ${approvalId}`);
  }
  return approval;
}

export function useApprovalState<T>(selector: (state: ApprovalState) => T): T {
  const approval = useApproval();

  return useSyncExternalStore(
    (callback) => approval.subscribe(callback),
    () => selector(approval.getState()),
    () => selector(approval.getState()),
  );
}

export function useApprovalStateById<T>(
  approvalId: string,
  selector: (state: ApprovalState) => T,
): T {
  const task = useTask();
  const approval = task.getApproval(approvalId);
  if (!approval) {
    throw new Error(`Approval not found: ${approvalId}`);
  }

  return useSyncExternalStore(
    (callback) => approval.subscribe(callback),
    () => selector(approval.getState()),
    () => selector(approval.getState()),
  );
}
