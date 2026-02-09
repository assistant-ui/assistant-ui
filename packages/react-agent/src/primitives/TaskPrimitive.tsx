"use client";

import { useMemo, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { TaskProvider, useTaskState } from "../hooks";
import type { TaskStatus } from "../runtime";
import { createActionButton } from "../actions/createActionButton";
import { useTaskCancel, useTaskRetry } from "./task/useTaskActions";

export interface TaskRootProps {
  taskId: string;
  children: ReactNode;
}

function TaskRoot({ taskId, children }: TaskRootProps) {
  return <TaskProvider taskId={taskId}>{children}</TaskProvider>;
}

TaskRoot.displayName = "TaskPrimitive.Root";

function TaskTitle(props: ComponentPropsWithoutRef<"span">) {
  const title = useTaskState((s) => s.title);
  return <span {...props}>{title}</span>;
}

TaskTitle.displayName = "TaskPrimitive.Title";

export interface TaskStatusProps extends ComponentPropsWithoutRef<"span"> {
  showIcon?: boolean;
}

const statusIcons: Record<TaskStatus, string> = {
  draft: "📝",
  starting: "⏳",
  running: "🔄",
  waiting_input: "⏸️",
  completed: "✅",
  failed: "❌",
  interrupting: "⏹️",
  interrupted: "⏹️",
  discarded: "🗑️",
};

const TaskStatus = Object.assign(
  function TaskStatus({ showIcon = true, ...props }: TaskStatusProps) {
    const status = useTaskState((s) => s.status);
    return (
      <span {...props}>
        {showIcon && `${statusIcons[status]} `}
        {status}
      </span>
    );
  },
  { displayName: "TaskPrimitive.Status" },
);

export interface TaskCostProps extends ComponentPropsWithoutRef<"span"> {
  precision?: number;
}

function TaskCost({ precision = 4, ...props }: TaskCostProps) {
  const cost = useTaskState((s) => s.cost);
  return <span {...props}>${cost.toFixed(precision)}</span>;
}

TaskCost.displayName = "TaskPrimitive.Cost";

export interface TaskAgentsProps {
  children: (agents: Array<{ id: string }>) => ReactNode;
}

function TaskAgents({ children }: TaskAgentsProps) {
  const agents = useTaskState((s) => s.agents);
  return <>{children(agents.map((a) => ({ id: a.id })))}</>;
}

TaskAgents.displayName = "TaskPrimitive.Agents";

export interface TaskApprovalsProps {
  children: (approvals: Array<{ id: string }>) => ReactNode;
}

function TaskApprovals({ children }: TaskApprovalsProps) {
  const allApprovals = useTaskState((s) => s.pendingApprovals);
  const approvals = useMemo(
    () => allApprovals.filter((a) => a.status === "pending"),
    [allApprovals],
  );
  return <>{children(approvals.map((a) => ({ id: a.id })))}</>;
}

TaskApprovals.displayName = "TaskPrimitive.Approvals";

export interface TaskIfProps {
  status: TaskStatus | TaskStatus[];
  children: ReactNode;
}

function TaskIf({ status, children }: TaskIfProps) {
  const currentStatus = useTaskState((s) => s.status);
  const statuses = Array.isArray(status) ? status : [status];

  if (!statuses.includes(currentStatus)) {
    return null;
  }

  return <>{children}</>;
}

TaskIf.displayName = "TaskPrimitive.If";

function TaskCreatedAt(props: ComponentPropsWithoutRef<"span">) {
  const createdAt = useTaskState((s) => s.createdAt);
  return <span {...props}>{createdAt.toISOString()}</span>;
}

TaskCreatedAt.displayName = "TaskPrimitive.CreatedAt";

function TaskCompletedAt(props: ComponentPropsWithoutRef<"span">) {
  const completedAt = useTaskState((s) => s.completedAt);
  if (!completedAt) return null;
  return <span {...props}>{completedAt.toISOString()}</span>;
}

TaskCompletedAt.displayName = "TaskPrimitive.CompletedAt";

const TaskCancel = createActionButton("TaskPrimitive.Cancel", useTaskCancel);
const TaskRetry = createActionButton("TaskPrimitive.Retry", useTaskRetry);

export const TaskPrimitive = {
  Root: TaskRoot,
  Title: TaskTitle,
  Status: TaskStatus,
  Cost: TaskCost,
  CreatedAt: TaskCreatedAt,
  CompletedAt: TaskCompletedAt,
  Agents: TaskAgents,
  Approvals: TaskApprovals,
  If: TaskIf,
  Cancel: TaskCancel,
  Retry: TaskRetry,
};
