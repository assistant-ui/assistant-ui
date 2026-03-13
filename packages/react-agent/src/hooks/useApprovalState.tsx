"use client";

import {
  createContext,
  useContext,
  useCallback,
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

export function useApproval(): ApprovalRuntime | null {
  const task = useTask();
  const approvalId = useApprovalId();
  const approval = task.getApproval(approvalId);
  // Return null instead of throwing - approval may be resolved/removed during render
  return approval ?? null;
}

const EMPTY_SUBSCRIBE = (_cb: () => void) => () => {};

export function useApprovalState<T>(
  selector: (state: ApprovalState) => T,
): T | null {
  const task = useTask();
  const approvalId = useApprovalId();

  const subscribe = useCallback(
    (callback: () => void) => {
      let approvalUnsubscribe =
        task.getApproval(approvalId)?.subscribe(callback) ??
        EMPTY_SUBSCRIBE(callback);
      const taskUnsubscribe = task.subscribe(() => {
        approvalUnsubscribe();
        approvalUnsubscribe =
          task.getApproval(approvalId)?.subscribe(callback) ??
          EMPTY_SUBSCRIBE(callback);
        callback();
      });

      return () => {
        approvalUnsubscribe();
        taskUnsubscribe();
      };
    },
    [task, approvalId],
  );

  const getSnapshot = useCallback(() => {
    return task.getApproval(approvalId)?.getState() ?? null;
  }, [task, approvalId]);

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return state ? selector(state) : null;
}

export function useApprovalStateById<T>(
  approvalId: string,
  selector: (state: ApprovalState) => T,
): T | null {
  const task = useTask();

  const subscribe = useCallback(
    (callback: () => void) => {
      let approvalUnsubscribe =
        task.getApproval(approvalId)?.subscribe(callback) ??
        EMPTY_SUBSCRIBE(callback);
      const taskUnsubscribe = task.subscribe(() => {
        approvalUnsubscribe();
        approvalUnsubscribe =
          task.getApproval(approvalId)?.subscribe(callback) ??
          EMPTY_SUBSCRIBE(callback);
        callback();
      });

      return () => {
        approvalUnsubscribe();
        taskUnsubscribe();
      };
    },
    [task, approvalId],
  );

  const getSnapshot = useCallback(() => {
    return task.getApproval(approvalId)?.getState() ?? null;
  }, [task, approvalId]);

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return state ? selector(state) : null;
}
