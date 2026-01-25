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

export interface WorkspaceConfig {
  apiKey: string;
  baseUrl?: string | undefined;
  /** Provide a custom client instance (e.g., for server-side use) */
  client?: AgentClientInterface | undefined;
}

export class WorkspaceRuntime {
  private client: AgentClientInterface;
  private tasks: Map<string, TaskRuntime> = new Map();
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
    const task = new TaskRuntime(handle, this.client);

    this.tasks.set(task.id, task);

    // Subscribe to task changes to propagate updates
    task.subscribe(() => this.notify());

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
    this.tasks.delete(taskId);
    this.notify();
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
