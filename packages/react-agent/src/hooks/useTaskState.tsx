"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
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
  const lastStateRef = useRef<TaskState | null>(null);
  const lastSelectionRef = useRef<T | null>(null);
  const hasSelectionRef = useRef(false);
  const selectorRef = useRef(selector);

  if (selectorRef.current !== selector) {
    selectorRef.current = selector;
    hasSelectionRef.current = false;
  }

  const subscribe = useCallback(
    (callback: () => void) => task.subscribe(callback),
    [task],
  );

  const getSnapshot = useCallback(() => {
    const state = task.getState();
    if (lastStateRef.current === state && hasSelectionRef.current) {
      return lastSelectionRef.current as T;
    }

    const selection = selectorRef.current(state);
    if (
      hasSelectionRef.current &&
      Object.is(lastSelectionRef.current, selection)
    ) {
      lastStateRef.current = state;
      return lastSelectionRef.current as T;
    }

    lastStateRef.current = state;
    lastSelectionRef.current = selection;
    hasSelectionRef.current = true;
    return selection;
  }, [task]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useTaskStateById<T>(
  taskId: string,
  selector: (state: TaskState) => T,
): T {
  const workspace = useAgentWorkspace();
  const task = workspace.getTask(taskId);
  const lastStateRef = useRef<TaskState | null>(null);
  const lastSelectionRef = useRef<T | null>(null);
  const hasSelectionRef = useRef(false);
  const selectorRef = useRef(selector);

  if (selectorRef.current !== selector) {
    selectorRef.current = selector;
    hasSelectionRef.current = false;
  }
  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }

  const subscribe = useCallback(
    (callback: () => void) => task.subscribe(callback),
    [task],
  );

  const getSnapshot = useCallback(() => {
    const state = task.getState();
    if (lastStateRef.current === state && hasSelectionRef.current) {
      return lastSelectionRef.current as T;
    }

    const selection = selectorRef.current(state);
    if (
      hasSelectionRef.current &&
      Object.is(lastSelectionRef.current, selection)
    ) {
      lastStateRef.current = state;
      return lastSelectionRef.current as T;
    }

    lastStateRef.current = state;
    lastSelectionRef.current = selection;
    hasSelectionRef.current = true;
    return selection;
  }, [task]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
