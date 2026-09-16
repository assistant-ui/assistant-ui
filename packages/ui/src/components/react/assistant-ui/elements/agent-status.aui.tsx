"use client";

import { useAuiState, type TaskState } from "@assistant-ui/react";
import { type FC, useMemo, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  AgentStatus as AgentStatusBase,
  type AgentState,
} from "./agent-status";
import { mono } from "./surfaces";
import { TaskStateIcon } from "./task-card";
import {
  formatElapsed,
  taskLabel,
  taskMeta,
  taskStateOf,
  useTaskElapsed,
} from "../utils/task";

export type TaskSummary = {
  readonly total: number;
  readonly running: number;
  readonly waiting: number;
  readonly failed: number;
  readonly startedAt: number | undefined;
  readonly runningLabel: string | undefined;
};

const summarize = (tasks: readonly TaskState[]): TaskSummary => {
  let running = 0;
  let waiting = 0;
  let failed = 0;
  let startedAt: number | undefined;
  let runningLabel: string | undefined;
  for (const task of tasks) {
    const state = taskStateOf(task.status, task.isError);
    if (state === "working") {
      running += 1;
      runningLabel ??= taskLabel(task.toolName, task.args);
      const taskStartedAt = task.timing?.startedAt;
      if (
        taskStartedAt !== undefined &&
        (startedAt === undefined || taskStartedAt < startedAt)
      ) {
        startedAt = taskStartedAt;
      }
    } else if (state === "waiting") {
      waiting += 1;
    } else if (state === "failed") {
      failed += 1;
    }
  }
  return {
    total: tasks.length,
    running,
    waiting,
    failed,
    startedAt,
    runningLabel,
  };
};

export const useTaskSummary = (): TaskSummary => {
  const tasks = useAuiState((s) => s.thread.tasks);
  return useMemo(() => summarize(tasks), [tasks]);
};

const plural = (count: number, noun: string) =>
  `${count} ${count === 1 ? noun : `${noun}s`}`;

export const summaryState = (summary: TaskSummary): AgentState => {
  if (summary.running > 0) return "working";
  if (summary.waiting > 0) return "waiting";
  return "done";
};

export const summaryLabel = (summary: TaskSummary) => {
  if (summary.running === 1 && summary.runningLabel !== undefined) {
    return summary.runningLabel;
  }
  if (summary.running > 0) {
    return `${summary.running} of ${plural(summary.total, "task")} running`;
  }
  if (summary.waiting > 0) {
    return `${plural(summary.waiting, "task")} waiting for input`;
  }
  if (summary.failed > 0) {
    return `${plural(summary.total, "task")} done, ${summary.failed} failed`;
  }
  return `${plural(summary.total, "task")} done`;
};

export const AgentStatus: FC<{ className?: string }> = ({ className }) => {
  const summary = useTaskSummary();
  const elapsedMs = useTaskElapsed(
    summary.startedAt === undefined
      ? undefined
      : { startedAt: summary.startedAt },
    summary.running > 0,
  );
  if (summary.total === 0) return null;

  return (
    <AgentStatusBase
      className={className}
      state={summaryState(summary)}
      label={summaryLabel(summary)}
      elapsed={elapsedMs === undefined ? undefined : formatElapsed(elapsedMs)}
    />
  );
};

const TaskTrayItem: FC<{ task: TaskState }> = ({ task }) => {
  const state = taskStateOf(task.status, task.isError);
  const meta = taskMeta(task.args);
  const elapsedMs = useTaskElapsed(task.timing, task.status.type === "running");

  return (
    <li
      data-slot="aui_task-tray-item"
      data-state={state}
      className="flex items-center gap-2.5 rounded-lg py-2 pe-2.5 text-[13px]"
      style={{ paddingInlineStart: `${0.625 + task.depth * 0.75}rem` }}
    >
      <TaskStateIcon state={state} />
      <span className="sr-only">{state}</span>
      <span className="min-w-0 flex-1 truncate">
        {taskLabel(task.toolName, task.args)}
      </span>
      {meta !== undefined && (
        <span className={cn(mono, "text-foreground/35 shrink-0")}>{meta}</span>
      )}
      {elapsedMs !== undefined && (
        <span className={cn(mono, "text-foreground/30 shrink-0 tabular-nums")}>
          {formatElapsed(elapsedMs)}
        </span>
      )}
    </li>
  );
};

export const TaskTray: FC<{ className?: string }> = ({ className }) => {
  const tasks = useAuiState((s) => s.thread.tasks);
  const summary = useMemo(() => summarize(tasks), [tasks]);
  const elapsedMs = useTaskElapsed(
    summary.startedAt === undefined
      ? undefined
      : { startedAt: summary.startedAt },
    summary.running > 0,
  );
  const [open, setOpen] = useState(false);
  if (summary.total === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        nativeButton={false}
        render={
          <AgentStatusBase
            className={cn("cursor-pointer", className)}
            state={summaryState(summary)}
            label={summaryLabel(summary)}
            elapsed={
              elapsedMs === undefined ? undefined : formatElapsed(elapsedMs)
            }
          />
        }
      />
      <PopoverContent align="end" className="w-80 p-1">
        <ul
          data-slot="aui_task-tray"
          aria-label="Tasks"
          className="flex max-h-80 flex-col overflow-y-auto"
        >
          {tasks.map((task, index) => (
            <TaskTrayItem key={`${index}:${task.id}`} task={task} />
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
};
