/**
 * In-memory store for active tasks.
 * In production, this would be replaced with a proper database or Redis.
 */

import type { TaskController } from "./TaskController";

// Use globalThis to persist across hot reloads in development
// This is a common pattern in Next.js for database connections, etc.
const globalForTaskStore = globalThis as unknown as {
  taskStore: Map<string, TaskController> | undefined;
};

// Global store for task controllers
// This is shared between the main route and the stream route
export const taskStore =
  globalForTaskStore.taskStore ?? new Map<string, TaskController>();

if (process.env.NODE_ENV !== "production") {
  globalForTaskStore.taskStore = taskStore;
}
