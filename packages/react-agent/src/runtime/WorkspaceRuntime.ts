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
    const taskOptions: CreateTaskOptions = {
      prompt,
      ...options,
    };

    const handle = await this.client.createTask(taskOptions);
    const task = new TaskRuntime(handle, this.client, this.permissionStore, {
      requiresApproval: taskOptions.requiresApproval,
    });

    this.tasks.set(task.id, task);

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

  private notify(): void {
    // Update the cached array before notifying listeners
    this.cachedTasksArray = Array.from(this.tasks.values());
    this.listeners.forEach((cb) => cb());
  }
}
