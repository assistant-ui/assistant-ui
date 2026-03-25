/**
 * In-memory store for active tasks.
 * In production, this would be replaced with a proper database or Redis.
 */

import type { TaskController } from "./TaskController";

const TASK_RETENTION_MS = 60 * 60 * 1000;
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;

// Use globalThis to persist across hot reloads in development
// This is a common pattern in Next.js for database connections, etc.
const globalForTaskStore = globalThis as unknown as {
  taskStore: Map<string, TaskController> | undefined;
  taskCompletedAt: Map<string, number> | undefined;
  taskSweepInterval: ReturnType<typeof setInterval> | undefined;
};

// Global store for task controllers
// This is shared between the main route and the stream route
export const taskStore =
  globalForTaskStore.taskStore ?? new Map<string, TaskController>();
const taskCompletedAt =
  globalForTaskStore.taskCompletedAt ?? new Map<string, number>();

export function setTaskController(taskId: string, controller: TaskController) {
  taskStore.set(taskId, controller);
  taskCompletedAt.delete(taskId);
}

export function getTaskController(taskId: string): TaskController | undefined {
  sweepExpiredTasks();
  return taskStore.get(taskId);
}

export function deleteTaskController(taskId: string): void {
  taskStore.delete(taskId);
  taskCompletedAt.delete(taskId);
}

export function sweepExpiredTasks(): void {
  const now = Date.now();

  for (const [taskId, controller] of taskStore.entries()) {
    if (controller.isActive()) {
      taskCompletedAt.delete(taskId);
      continue;
    }

    const completedAt = taskCompletedAt.get(taskId);
    if (completedAt === undefined) {
      taskCompletedAt.set(taskId, now);
      continue;
    }

    if (now - completedAt >= TASK_RETENTION_MS) {
      taskStore.delete(taskId);
      taskCompletedAt.delete(taskId);
    }
  }
}

if (!globalForTaskStore.taskSweepInterval) {
  const interval = setInterval(() => {
    sweepExpiredTasks();
  }, SWEEP_INTERVAL_MS);

  // Do not keep the process alive just for periodic eviction.
  interval.unref?.();
  globalForTaskStore.taskSweepInterval = interval;
}

if (process.env.NODE_ENV !== "production") {
  globalForTaskStore.taskStore = taskStore;
  globalForTaskStore.taskCompletedAt = taskCompletedAt;
}
