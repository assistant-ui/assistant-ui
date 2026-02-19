"use client";

import { useMemo } from "react";
import { useWorkspaceTasks } from "../../hooks/useAgentWorkspace";

export type ApprovalFilterStatus = "all" | "pending" | "approved" | "denied";

export interface ApprovalFilterOptions {
  status?: ApprovalFilterStatus;
  toolName?: string;
  taskId?: string;
  agentId?: string;
}

export function useApprovalQueue(filter?: ApprovalFilterOptions) {
  const tasks = useWorkspaceTasks();

  return useMemo(() => {
    const allApprovals = tasks.flatMap((task) => {
      const taskApprovals = task.getState().pendingApprovals || [];
      return taskApprovals.map((approval) => ({
        ...approval,
        taskId: task.id,
      }));
    });

    return allApprovals.filter((approval) => {
      if (
        filter?.status &&
        filter.status !== "all" &&
        approval.status !== filter.status
      ) {
        return false;
      }

      if (filter?.toolName && !approval.toolName.includes(filter.toolName)) {
        return false;
      }

      if (filter?.taskId && approval.taskId !== filter.taskId) {
        return false;
      }

      if (filter?.agentId && approval.agentId !== filter.agentId) {
        return false;
      }

      return true;
    });
  }, [tasks, filter]);
}
