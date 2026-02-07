"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
  type ComponentPropsWithoutRef,
} from "react";
import { useAgentWorkspace } from "../../hooks/useAgentWorkspace";
import {
  useApprovalQueue,
  type ApprovalFilterOptions,
} from "./useApprovalQueue";
import { createActionButton } from "../../actions/createActionButton";
import type { ApprovalState } from "../../runtime/types";

interface ApprovalQueueContextValue {
  approvals: ApprovalState[];
  filter: ApprovalFilterOptions | undefined;
}

const ApprovalQueueContext = createContext<ApprovalQueueContextValue | null>(
  null,
);

function useApprovalQueueContext() {
  const ctx = useContext(ApprovalQueueContext);
  if (!ctx) {
    throw new Error(
      "useApprovalQueueContext must be used within ApprovalQueuePrimitive.Root",
    );
  }
  return ctx;
}

export interface ApprovalQueueRootProps {
  filter?: ApprovalFilterOptions;
  children: ReactNode;
}

function ApprovalQueueRoot({ filter, children }: ApprovalQueueRootProps) {
  const approvals = useApprovalQueue(filter);

  const value = useMemo(
    () => ({
      approvals,
      filter,
    }),
    [approvals, filter],
  );

  return (
    <ApprovalQueueContext.Provider value={value}>
      {children}
    </ApprovalQueueContext.Provider>
  );
}

ApprovalQueueRoot.displayName = "ApprovalQueuePrimitive.Root";

export interface ApprovalQueueCountProps
  extends Omit<ComponentPropsWithoutRef<"span">, "children"> {
  children?: (count: number) => ReactNode;
}

function ApprovalQueueCount({ children, ...props }: ApprovalQueueCountProps) {
  const { approvals } = useApprovalQueueContext();
  const pendingCount = approvals.filter((a) => a.status === "pending").length;

  return (
    <span {...props}>
      {typeof children === "function" ? children(pendingCount) : pendingCount}
    </span>
  );
}

ApprovalQueueCount.displayName = "ApprovalQueuePrimitive.Count";

export interface ApprovalQueueItemsProps {
  children: (approvals: ApprovalState[]) => ReactNode;
}

function ApprovalQueueItems({ children }: ApprovalQueueItemsProps) {
  const { approvals } = useApprovalQueueContext();
  return <>{children(approvals)}</>;
}

ApprovalQueueItems.displayName = "ApprovalQueuePrimitive.Items";

// Self-contained ApproveAll action hook
function useApproveAll() {
  const workspace = useAgentWorkspace();
  const { approvals } = useApprovalQueueContext();
  const pending = approvals.filter((a) => a.status === "pending");

  if (pending.length === 0) return null;

  return async () => {
    for (const approval of pending) {
      const task = workspace.getTask(approval.taskId);
      const approvalRuntime = task?.getApproval(approval.id);
      if (approvalRuntime) {
        await approvalRuntime.approve("once");
      }
    }
  };
}

// Self-contained DenyAll action hook
function useDenyAll() {
  const workspace = useAgentWorkspace();
  const { approvals } = useApprovalQueueContext();
  const pending = approvals.filter((a) => a.status === "pending");

  if (pending.length === 0) return null;

  return async () => {
    for (const approval of pending) {
      const task = workspace.getTask(approval.taskId);
      const approvalRuntime = task?.getApproval(approval.id);
      if (approvalRuntime) {
        await approvalRuntime.deny();
      }
    }
  };
}

const ApproveAll = createActionButton(
  "ApprovalQueuePrimitive.ApproveAll",
  useApproveAll,
);

const DenyAll = createActionButton(
  "ApprovalQueuePrimitive.DenyAll",
  useDenyAll,
);

export const ApprovalQueuePrimitive = {
  Root: ApprovalQueueRoot,
  Count: ApprovalQueueCount,
  Items: ApprovalQueueItems,
  ApproveAll,
  DenyAll,
};
