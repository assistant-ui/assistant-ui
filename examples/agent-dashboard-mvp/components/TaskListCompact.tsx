"use client";

import {
  TaskPrimitive,
  useTaskState,
  useWorkspaceTasks,
} from "@assistant-ui/react-agent";
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

function TaskListItem({
  taskId,
  isSelected,
  onSelect,
}: {
  taskId: string;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <TaskPrimitive.Root taskId={taskId}>
      <TaskListItemContent isSelected={isSelected} onSelect={onSelect} />
    </TaskPrimitive.Root>
  );
}

function TaskListItemContent({
  isSelected,
  onSelect,
}: {
  isSelected: boolean;
  onSelect: () => void;
}) {
  const state = useTaskState((s) => s);

  const pendingApprovals = state.pendingApprovals.filter(
    (a) => a.status === "pending",
  ).length;

  const statusIcons = {
    queued: <Clock className="h-4 w-4 text-muted-foreground" />,
    running: <Loader2 className="h-4 w-4 animate-spin text-blue-500" />,
    completed: <CheckCircle2 className="h-4 w-4 text-success" />,
    failed: <XCircle className="h-4 w-4 text-destructive" />,
  };

  const formatTime = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors",
        isSelected
          ? "bg-primary/10 ring-1 ring-primary/30"
          : "hover:bg-muted/50",
      )}
    >
      <span className="mt-0.5 shrink-0">{statusIcons[state.status]}</span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm",
            isSelected ? "font-medium" : "text-foreground",
          )}
        >
          {state.title}
        </p>
        <div className="mt-1 flex items-center gap-2 text-muted-foreground text-xs">
          <span>{formatTime(state.createdAt)}</span>
          <span>•</span>
          <span>${state.cost.toFixed(4)}</span>
        </div>
      </div>
      {pendingApprovals > 0 && (
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-warning px-2 py-0.5 text-warning-foreground text-xs">
          <AlertCircle className="h-3 w-3" />
          {pendingApprovals}
        </span>
      )}
    </button>
  );
}

export interface TaskListCompactProps {
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
  className?: string;
}

export function TaskListCompact({
  selectedTaskId,
  onSelectTask,
  className,
}: TaskListCompactProps) {
  const tasks = useWorkspaceTasks();

  const activeTasks = tasks.filter(
    (t) =>
      t.getState().status === "running" || t.getState().status === "queued",
  );
  const completedTasks = tasks.filter(
    (t) =>
      t.getState().status === "completed" || t.getState().status === "failed",
  );

  if (tasks.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center p-8",
          className,
        )}
      >
        <Activity className="mb-3 h-8 w-8 text-muted-foreground/50" />
        <p className="text-center text-muted-foreground text-sm">
          No tasks yet
        </p>
        <p className="mt-1 text-center text-muted-foreground/70 text-xs">
          Launch a task to get started
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {activeTasks.length > 0 && (
        <div>
          <h3 className="mb-2 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
            Active ({activeTasks.length})
          </h3>
          <div className="space-y-1">
            {activeTasks.map((task) => (
              <TaskListItem
                key={task.id}
                taskId={task.id}
                isSelected={task.id === selectedTaskId}
                onSelect={() => onSelectTask(task.id)}
              />
            ))}
          </div>
        </div>
      )}

      {completedTasks.length > 0 && (
        <div>
          <h3 className="mb-2 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
            Completed ({completedTasks.length})
          </h3>
          <div className="space-y-1">
            {completedTasks.map((task) => (
              <TaskListItem
                key={task.id}
                taskId={task.id}
                isSelected={task.id === selectedTaskId}
                onSelect={() => onSelectTask(task.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
