"use client";

import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { TaskRuntime, TaskState } from "../runtime";
import { useAgentWorkspace, useWorkspaceTasks } from "./useAgentWorkspace";

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
  const tasks = useWorkspaceTasks();
  const taskId = useTaskId();
  const task = tasks.find((task) => task.id === taskId);
  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }
  return task;
}

export function useTaskState<T>(selector: (state: TaskState) => T): T {
  const task = useTask();

  const subscribe = useCallback(
    (callback: () => void) => task.subscribe(callback),
    [task],
  );

  const getSnapshot = useCallback(
    () => selector(task.getState()),
    [task, selector],
  );

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
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

  const subscribe = useCallback(
    (callback: () => void) => task.subscribe(callback),
    [task],
  );

  const getSnapshot = useCallback(
    () => selector(task.getState()),
    [task, selector],
  );

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
