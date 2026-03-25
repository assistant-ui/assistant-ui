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
  const status = filter?.status;
  const toolName = filter?.toolName;
  const taskId = filter?.taskId;
  const agentId = filter?.agentId;

  return useMemo(() => {
    const allApprovals = tasks.flatMap((task) => {
      const taskApprovals = task.getState().pendingApprovals || [];
      return taskApprovals.map((approval) => ({
        ...approval,
        taskId: task.id,
      }));
    });

    return allApprovals.filter((approval) => {
      if (status && status !== "all" && approval.status !== status) {
        return false;
      }

      if (toolName && !approval.toolName.includes(toolName)) {
        return false;
      }

      if (taskId && approval.taskId !== taskId) {
        return false;
      }

      if (agentId && approval.agentId !== agentId) {
        return false;
      }

      return true;
    });
  }, [tasks, status, toolName, taskId, agentId]);
}
