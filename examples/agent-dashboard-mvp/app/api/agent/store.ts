/**
 * In-memory store for active tasks.
 * In production, this would be replaced with a proper database or Redis.
 */

import type { TaskController } from "./TaskController";

// Global store for task controllers
// This is shared between the main route and the stream route
export const taskStore = new Map<string, TaskController>();
