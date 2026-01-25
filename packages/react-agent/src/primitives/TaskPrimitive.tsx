"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { TaskProvider, useTask, useTaskState } from "../hooks";
import type { TaskStatus } from "../runtime";

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
  queued: "\u23F3",
  running: "\uD83D\uDD04",
  completed: "\u2705",
  failed: "\u274C",
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

function TaskCancel(props: ComponentPropsWithoutRef<"button">) {
  const task = useTask();
  const status = useTaskState((s) => s.status);

  if (status !== "running" && status !== "queued") {
    return null;
  }

  return (
    <button type="button" onClick={() => task.cancel()} {...props}>
      {props.children ?? "Cancel"}
    </button>
  );
}

TaskCancel.displayName = "TaskPrimitive.Cancel";

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
  const approvals = useTaskState((s) =>
    s.pendingApprovals.filter((a) => a.status === "pending"),
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

export const TaskPrimitive = {
  Root: TaskRoot,
  Title: TaskTitle,
  Status: TaskStatus,
  Cost: TaskCost,
  Cancel: TaskCancel,
  Agents: TaskAgents,
  Approvals: TaskApprovals,
  If: TaskIf,
};
