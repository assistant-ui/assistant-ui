/**
 * Top-level runtime for managing the agent workspace.
 * Handles task creation, listing, and coordination.
 */

import {
  HttpAgentClient,
  type AgentClientInterface,
} from "../sdk/HttpAgentClient";
import { TaskRuntime } from "./TaskRuntime";
import type { AgentClientConfig, CreateTaskOptions } from "./types";
import type { PermissionStoreInterface } from "./PermissionStore";
import { LocalStoragePermissionStore } from "./PermissionStore";

export interface WorkspaceConfig {
  apiKey: string;
  baseUrl?: string | undefined;
  client?: AgentClientInterface | undefined;
  permissionStore?: PermissionStoreInterface | undefined;
}

export class WorkspaceRuntime {
  private client: AgentClientInterface;
  private permissionStore: PermissionStoreInterface;
  private tasks: Map<string, TaskRuntime> = new Map();
  private threadTaskBindings: Map<string, string> = new Map();
  private taskUnsubscribes: Map<string, () => void> = new Map();
  private listeners: Set<() => void> = new Set();
  private cachedTasksArray: TaskRuntime[] = [];

  constructor(config: WorkspaceConfig) {
    if (config.client) {
      this.client = config.client;
    } else {
      const clientConfig: AgentClientConfig = {
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
      };
      this.client = new HttpAgentClient(clientConfig);
    }

    this.permissionStore =
      config.permissionStore ?? new LocalStoragePermissionStore();
  }

  async createTask(
    prompt: string,
    options?: Partial<CreateTaskOptions>,
  ): Promise<TaskRuntime> {
    return this.createTaskInternal(prompt, options);
  }

  async createThreadTask(
    threadId: string,
    prompt: string,
    options?: Partial<CreateTaskOptions>,
  ): Promise<TaskRuntime> {
    return this.createTaskInternal(prompt, options, threadId);
  }

  getTaskByThreadId(threadId: string): TaskRuntime | null {
    const taskId = this.threadTaskBindings.get(threadId);
    if (!taskId) return null;
    return this.tasks.get(taskId) ?? null;
  }

  getThreadTaskId(threadId: string): string | null {
    return this.threadTaskBindings.get(threadId) ?? null;
  }

  bindThreadToTask(threadId: string, taskId: string): void {
    if (!this.tasks.has(taskId)) {
      throw new Error(`Task not found: ${taskId}`);
    }

    this.threadTaskBindings.set(threadId, taskId);
    this.notify();
  }

  clearThreadTask(threadId: string): void {
    if (!this.threadTaskBindings.has(threadId)) return;
    this.threadTaskBindings.delete(threadId);
    this.notify();
  }

  private async createTaskInternal(
    prompt: string,
    options?: Partial<CreateTaskOptions>,
    threadId?: string,
  ): Promise<TaskRuntime> {
    const taskOptions: CreateTaskOptions = {
      ...options,
      prompt,
    };

    const handle = await this.client.createTask(taskOptions);
    const task = new TaskRuntime(handle, this.client, this.permissionStore, {
      requiresApproval: taskOptions.requiresApproval,
    });

    this.tasks.set(task.id, task);
    if (threadId) {
      this.threadTaskBindings.set(threadId, task.id);
    }

    // Subscribe to task changes to propagate updates
    const unsubscribe = task.subscribe(() => this.notify());
    this.taskUnsubscribes.set(task.id, unsubscribe);

    this.notify();
    return task;
  }

  getTasks(): TaskRuntime[] {
    return this.cachedTasksArray;
  }

  getTask(taskId: string): TaskRuntime | undefined {
    return this.tasks.get(taskId);
  }

  removeTask(taskId: string): void {
    const unsubscribe = this.taskUnsubscribes.get(taskId);
    if (unsubscribe) {
      unsubscribe();
      this.taskUnsubscribes.delete(taskId);
    }
    for (const [threadId, boundTaskId] of this.threadTaskBindings.entries()) {
      if (boundTaskId === taskId) {
        this.threadTaskBindings.delete(threadId);
      }
    }
    this.tasks.delete(taskId);
    this.notify();
  }

  getPermissionStore(): PermissionStoreInterface {
    return this.permissionStore;
  }

  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyScheduled = false;

  private notify(): void {
    // Update the cached array synchronously so getTasks() is never stale
    this.cachedTasksArray = Array.from(this.tasks.values());
    if (this.notifyScheduled) return;
    this.notifyScheduled = true;
    queueMicrotask(() => {
      this.notifyScheduled = false;
      this.listeners.forEach((cb) => cb());
    });
  }
}
