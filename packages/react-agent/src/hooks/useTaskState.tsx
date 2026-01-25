"use client";

import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { TaskRuntime, TaskState } from "../runtime";
import { useAgentWorkspace } from "./useAgentWorkspace";

const TaskContext = createContext<string | null>(null);

export interface TaskProviderProps {
  taskId: string;
  children: ReactNode;
}

export function TaskProvider({ taskId, children }: TaskProviderProps) {
  return <TaskContext.Provider value={taskId}>{children}</TaskContext.Provider>;
}

export function useTaskId(): string {
  const taskId = useContext(TaskContext);
  if (!taskId) {
    throw new Error("useTaskId must be used within a TaskProvider");
  }
  return taskId;
}

export function useTask(): TaskRuntime {
  const workspace = useAgentWorkspace();
  const taskId = useTaskId();
  const task = workspace.getTask(taskId);
  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }
  return task;
}

export function useTaskState<T>(selector: (state: TaskState) => T): T {
  const task = useTask();

  return useSyncExternalStore(
    (callback) => task.subscribe(callback),
    () => selector(task.getState()),
    () => selector(task.getState()),
  );
}

export function useTaskStateById<T>(
  taskId: string,
  selector: (state: TaskState) => T,
): T {
  const workspace = useAgentWorkspace();
  const task = workspace.getTask(taskId);
  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }

  return useSyncExternalStore(
    (callback) => task.subscribe(callback),
    () => selector(task.getState()),
    () => selector(task.getState()),
  );
}
