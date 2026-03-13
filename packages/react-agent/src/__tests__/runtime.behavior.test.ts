import { describe, expect, it, vi } from "vitest";
import type { AgentClientInterface } from "../sdk/HttpAgentClient";
import { ApprovalRuntime } from "../runtime/ApprovalRuntime";
import {
  LocalStoragePermissionStore,
  type PermissionMode,
  type PermissionStoreInterface,
  type ToolPermission,
} from "../runtime/PermissionStore";
import { TaskRuntime } from "../runtime/TaskRuntime";
import type {
  CreateTaskOptions,
  SDKEvent,
  SDKEventType,
  TaskHandle,
} from "../runtime/types";
import { WorkspaceRuntime } from "../runtime/WorkspaceRuntime";

class AsyncEventQueue<T> implements AsyncIterable<T> {
  private items: T[] = [];
  private resolvers: Array<(value: IteratorResult<T>) => void> = [];
  private closed = false;

  push(item: T): void {
    if (this.closed) throw new Error("Queue is closed");
    const resolve = this.resolvers.shift();
    if (resolve) {
      resolve({ value: item, done: false });
      return;
    }
    this.items.push(item);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    for (const resolve of this.resolvers.splice(0)) {
      resolve({ value: undefined as unknown as T, done: true });
    }
  }

  async next(): Promise<IteratorResult<T>> {
    if (this.items.length > 0) {
      return { value: this.items.shift()!, done: false };
    }
    if (this.closed) {
      return { value: undefined as unknown as T, done: true };
    }
    return new Promise((resolve) => this.resolvers.push(resolve));
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return {
      next: () => this.next(),
    };
  }
}

class TestClient implements AgentClientInterface {
  private nextTaskIds: string[];
  private queues = new Map<string, AsyncEventQueue<SDKEvent>>();
  public createTaskCalls: CreateTaskOptions[] = [];
  public approvalCalls: Array<{
    taskId: string;
    approvalId: string;
    decision: "allow" | "deny";
  }> = [];
  public cancelCalls: string[] = [];

  constructor(taskIds: string[]) {
    this.nextTaskIds = [...taskIds];
    for (const taskId of taskIds) {
      this.getQueue(taskId);
    }
  }

  async createTask(options: CreateTaskOptions): Promise<TaskHandle> {
    this.createTaskCalls.push(options);
    const nextId =
      this.nextTaskIds.shift() ??
      `task-${this.createTaskCalls.length + this.queues.size}`;
    this.getQueue(nextId);
    return { id: nextId, prompt: options.prompt };
  }

  async *streamEvents(taskId: string): AsyncGenerator<SDKEvent> {
    for await (const event of this.getQueue(taskId)) {
      yield event;
    }
  }

  async approveToolUse(
    taskId: string,
    approvalId: string,
    decision: "allow" | "deny",
  ): Promise<void> {
    this.approvalCalls.push({ taskId, approvalId, decision });
  }

  async cancelTask(taskId: string): Promise<void> {
    this.cancelCalls.push(taskId);
  }

  emit(event: SDKEvent): void {
    this.getQueue(event.taskId).push(event);
  }

  close(taskId: string): void {
    this.getQueue(taskId).close();
  }

  private getQueue(taskId: string): AsyncEventQueue<SDKEvent> {
    let queue = this.queues.get(taskId);
    if (!queue) {
      queue = new AsyncEventQueue<SDKEvent>();
      this.queues.set(taskId, queue);
    }
    return queue;
  }
}

class MemoryPermissionStore implements PermissionStoreInterface {
  private mode: PermissionMode = "ask-all";
  private sessionPermissions = new Map<string, ToolPermission>();
  private persistedPermissions = new Map<string, ToolPermission>();
  private listeners = new Set<() => void>();

  getMode(): PermissionMode {
    return this.mode;
  }

  setMode(mode: PermissionMode): void {
    this.mode = mode;
    this.notify();
  }

  getToolPermission(toolName: string): ToolPermission | undefined {
    const permission = this.sessionPermissions.get(toolName);
    if (permission?.expiresAt && Date.now() > permission.expiresAt) {
      this.clearToolPermission(toolName);
      return undefined;
    }
    return permission;
  }

  setToolPermission(toolName: string, permission: ToolPermission): void {
    this.sessionPermissions.set(toolName, permission);
    this.notify();
  }

  clearToolPermission(toolName: string): void {
    this.sessionPermissions.delete(toolName);
    this.notify();
  }

  getPersistedPermissions(): ToolPermission[] {
    return Array.from(this.persistedPermissions.values());
  }

  persistPermission(toolName: string): void {
    this.persistedPermissions.set(toolName, {
      toolName,
      mode: "allow",
    });
    this.notify();
  }

  clearPersistedPermission(toolName: string): void {
    this.persistedPermissions.delete(toolName);
    this.notify();
  }

  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify(): void {
    this.listeners.forEach((cb) => cb());
  }
}

class MockLocalStorage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

function sdkEvent(
  type: SDKEventType,
  taskId: string,
  data: unknown,
  agentId?: string,
): SDKEvent {
  const event: SDKEvent = {
    type,
    taskId,
    data,
    timestamp: new Date("2026-02-28T00:00:00.000Z"),
  };
  if (agentId) event.agentId = agentId;
  return event;
}

async function waitForCondition(
  condition: () => boolean,
  timeoutMs = 1500,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("Timed out waiting for condition");
}

describe("runtime behavior", () => {
  it("processes streamed task, agent, and approval events", async () => {
    const client = new TestClient([]);
    const permissionStore = new MemoryPermissionStore();
    const task = new TaskRuntime(
      { id: "task-1", prompt: "Inspect and update config" },
      client,
      permissionStore,
    );

    client.emit(
      sdkEvent("task_started", "task-1", {
        prompt: "Inspect and update config",
      }),
    );
    client.emit(
      sdkEvent(
        "agent_spawned",
        "task-1",
        { name: "Claude", parentAgentId: null },
        "agent-1",
      ),
    );
    client.emit(
      sdkEvent(
        "tool_use_requested",
        "task-1",
        {
          approvalId: "approval-1",
          toolCallId: "tool-1",
          toolName: "Write",
          toolInput: { filePath: "README.md" },
          reason: "Need to update docs",
        },
        "agent-1",
      ),
    );

    await waitForCondition(
      () =>
        task.getState().status === "waiting_input" &&
        task.getState().pendingApprovals.length === 1 &&
        task.getApproval("approval-1") !== undefined,
    );

    const approval = task.getApproval("approval-1");
    expect(approval).toBeDefined();
    await approval!.approve("session");

    expect(client.approvalCalls).toContainEqual({
      taskId: "task-1",
      approvalId: "approval-1",
      decision: "allow",
    });
    expect(permissionStore.getToolPermission("Write")?.mode).toBe("allow");
    await waitForCondition(
      () => task.getState().pendingApprovals[0]?.status === "approved",
    );

    client.emit(
      sdkEvent(
        "tool_use_approved",
        "task-1",
        { approvalId: "approval-1", toolCallId: "tool-1" },
        "agent-1",
      ),
    );
    client.emit(sdkEvent("task_completed", "task-1", { totalCost: 42.5 }));
    client.close("task-1");

    await waitForCondition(
      () =>
        task.getState().status === "completed" &&
        task.getState().cost === 42.5 &&
        task.getState().pendingApprovals.length === 0,
    );

    expect(task.getAgent("agent-1")).toBeDefined();
    expect(task.getAgent("agent-1")?.getState().events.length).toBeGreaterThan(
      0,
    );
  });

  it("retry clears state and ignores stale events from previous stream", async () => {
    const client = new TestClient(["task-2"]);
    const task = new TaskRuntime(
      { id: "task-1", prompt: "Retry me" },
      client,
      new MemoryPermissionStore(),
    );

    client.emit(
      sdkEvent(
        "agent_spawned",
        "task-1",
        { name: "Planner", parentAgentId: null },
        "agent-old",
      ),
    );
    client.emit(sdkEvent("task_failed", "task-1", { reason: "boom" }));

    await waitForCondition(
      () =>
        task.getState().status === "failed" &&
        task.getState().agents.some((a) => a.id === "agent-old"),
    );

    const retryPromise = task.retry();

    // This stale event arrives after retry() is called and must be ignored.
    client.emit(sdkEvent("task_completed", "task-1", { totalCost: 999 }));
    client.close("task-1");

    await retryPromise;

    await waitForCondition(
      () =>
        task.getState().status === "starting" &&
        task.getState().agents.length === 0 &&
        task.getState().pendingApprovals.length === 0 &&
        task.getState().cost === 0,
    );

    client.emit(sdkEvent("task_started", "task-2", { prompt: "Retry me" }));
    client.emit(sdkEvent("task_completed", "task-2", { totalCost: 3 }));
    client.close("task-2");

    await waitForCondition(() => task.getState().status === "completed");
    expect(task.getState().cost).toBe(3);
    expect(client.createTaskCalls).toHaveLength(1);
    expect(client.createTaskCalls[0]?.prompt).toBe("Retry me");
  });

  it("auto-approves based on stored permissions and permission mode", async () => {
    const client = new TestClient([]);
    const permissionStore = new MemoryPermissionStore();
    const task = new TaskRuntime(
      { id: "task-permissions", prompt: "Check permissions" },
      client,
      permissionStore,
    );

    client.emit(
      sdkEvent(
        "agent_spawned",
        "task-permissions",
        { name: "Claude", parentAgentId: null },
        "agent-1",
      ),
    );

    permissionStore.setToolPermission("Write", {
      toolName: "Write",
      mode: "allow",
    });

    client.emit(
      sdkEvent(
        "tool_use_requested",
        "task-permissions",
        {
          approvalId: "approval-write",
          toolCallId: "tool-write",
          toolName: "Write",
          toolInput: { filePath: "README.md" },
          reason: "Need to update docs",
        },
        "agent-1",
      ),
    );

    await waitForCondition(() =>
      client.approvalCalls.some(
        (call) =>
          call.taskId === "task-permissions" &&
          call.approvalId === "approval-write" &&
          call.decision === "allow",
      ),
    );
    expect(task.getApproval("approval-write")).toBeUndefined();

    task.setPermissionMode("auto-reads");
    client.emit(
      sdkEvent(
        "tool_use_requested",
        "task-permissions",
        {
          approvalId: "approval-read",
          toolCallId: "tool-read",
          toolName: "Read",
          toolInput: { filePath: "README.md" },
          reason: "Read docs",
        },
        "agent-1",
      ),
    );

    await waitForCondition(() =>
      client.approvalCalls.some(
        (call) =>
          call.taskId === "task-permissions" &&
          call.approvalId === "approval-read" &&
          call.decision === "allow",
      ),
    );
    expect(task.getApproval("approval-read")).toBeUndefined();

    client.emit(
      sdkEvent(
        "tool_use_requested",
        "task-permissions",
        {
          approvalId: "approval-bash",
          toolCallId: "tool-bash",
          toolName: "Bash",
          toolInput: { command: "pwd" },
          reason: "Run bash",
        },
        "agent-1",
      ),
    );

    await waitForCondition(
      () => task.getApproval("approval-bash") !== undefined,
    );
  });

  it("approval runtime persists always-allow permissions and supports deny flow", async () => {
    const originalWindow = (globalThis as { window?: unknown }).window;
    const originalLocalStorage = (globalThis as { localStorage?: unknown })
      .localStorage;
    const localStorage = new MockLocalStorage();

    try {
      (globalThis as { window?: unknown }).window = {
        localStorage,
      };
      (globalThis as { localStorage?: unknown }).localStorage = localStorage;

      const client = new TestClient([]);
      const onResolve = vi.fn();
      const permissionStore = new LocalStoragePermissionStore();
      const approval = new ApprovalRuntime(
        {
          id: "approval-persist",
          toolName: "Edit",
          toolInput: { filePath: "a.txt" },
          reason: "Need to patch file",
          status: "pending",
          taskId: "task-1",
          agentId: "agent-1",
          createdAt: new Date("2026-02-28T00:00:00.000Z"),
        },
        client,
        onResolve,
        permissionStore,
      );

      await approval.approve("always");

      expect(approval.getState().status).toBe("approved");
      expect(onResolve).toHaveBeenCalledWith("approved");
      expect(client.approvalCalls).toContainEqual({
        taskId: "task-1",
        approvalId: "approval-persist",
        decision: "allow",
      });

      const persistedRaw = localStorage.getItem("agent-ui-permissions");
      expect(persistedRaw).not.toBeNull();
      const persisted = JSON.parse(persistedRaw!);
      expect(persisted.permissions).toContainEqual({
        toolName: "Edit",
        mode: "allow",
      });

      const reloadedStore = new LocalStoragePermissionStore();
      expect(reloadedStore.getToolPermission("Edit")?.mode).toBe("allow");

      const denied = new ApprovalRuntime(
        {
          id: "approval-deny",
          toolName: "Delete",
          toolInput: { filePath: "b.txt" },
          reason: "Dangerous action",
          status: "pending",
          taskId: "task-1",
          agentId: "agent-1",
          createdAt: new Date("2026-02-28T00:00:00.000Z"),
        },
        client,
        onResolve,
        permissionStore,
      );
      await denied.deny();
      expect(denied.getState().status).toBe("denied");
      expect(client.approvalCalls).toContainEqual({
        taskId: "task-1",
        approvalId: "approval-deny",
        decision: "deny",
      });

      let resolveApproval: (() => void) | undefined;
      const approveToolUse = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveApproval = resolve;
          }),
      );
      const raceClient: AgentClientInterface = {
        createTask: (options) => client.createTask(options),
        streamEvents: (taskId) => client.streamEvents(taskId),
        cancelTask: (taskId) => client.cancelTask(taskId),
        approveToolUse,
      };

      const raceOnResolve = vi.fn();
      const raceApproval = new ApprovalRuntime(
        {
          id: "approval-race",
          toolName: "Read",
          toolInput: { filePath: "c.txt" },
          reason: "Concurrency test",
          status: "pending",
          taskId: "task-1",
          agentId: "agent-1",
          createdAt: new Date("2026-02-28T00:00:00.000Z"),
        },
        raceClient,
        raceOnResolve,
        permissionStore,
      );

      const firstApprove = raceApproval.approve("once");
      await expect(raceApproval.approve("once")).rejects.toThrow(
        "Approval is not pending",
      );
      expect(approveToolUse).toHaveBeenCalledTimes(1);
      expect(raceApproval.getState().status).toBe("processing");

      resolveApproval?.();
      await firstApprove;
      expect(raceApproval.getState().status).toBe("approved");
      expect(raceOnResolve).toHaveBeenCalledTimes(1);

      localStorage.setItem(
        "agent-ui-permissions",
        JSON.stringify({
          permissions: [
            { toolName: "SafeRead", mode: "allow" },
            { toolName: "Bash", mode: "allow", expiresAt: "bad" },
            { toolName: 123, mode: "allow" },
            { toolName: "Write", mode: "invalid" },
            "not-an-object",
          ],
        }),
      );
      const validatedStore = new LocalStoragePermissionStore();
      expect(validatedStore.getPersistedPermissions()).toEqual([
        { toolName: "SafeRead", mode: "allow" },
      ]);
      expect(validatedStore.getToolPermission("SafeRead")).toEqual({
        toolName: "SafeRead",
        mode: "allow",
      });
      expect(validatedStore.getToolPermission("Bash")).toBeUndefined();
    } finally {
      if (originalWindow === undefined) {
        delete (globalThis as { window?: unknown }).window;
      } else {
        (globalThis as { window?: unknown }).window = originalWindow;
      }

      if (originalLocalStorage === undefined) {
        delete (globalThis as { localStorage?: unknown }).localStorage;
      } else {
        (globalThis as { localStorage?: unknown }).localStorage =
          originalLocalStorage;
      }
    }
  });

  it("workspace removeTask unsubscribes from task updates", async () => {
    const client = new TestClient(["task-1"]);
    const workspace = new WorkspaceRuntime({
      apiKey: "test-key",
      client,
      permissionStore: new MemoryPermissionStore(),
    });

    const onWorkspaceUpdate = vi.fn();
    const unsubscribe = workspace.subscribe(onWorkspaceUpdate);

    const task = await workspace.createTask("Run diagnostics");
    expect(workspace.getTask(task.id)).toBe(task);
    expect(workspace.getTasks()).toHaveLength(1);

    const notifyAfterCreate = onWorkspaceUpdate.mock.calls.length;
    client.emit(
      sdkEvent("task_started", task.id, { prompt: "Run diagnostics" }),
    );
    await waitForCondition(
      () => onWorkspaceUpdate.mock.calls.length > notifyAfterCreate,
    );

    workspace.removeTask(task.id);
    expect(workspace.getTask(task.id)).toBeUndefined();
    expect(workspace.getTasks()).toHaveLength(0);

    const notifyAfterRemove = onWorkspaceUpdate.mock.calls.length;

    // Task can still receive stream events, but workspace should no longer notify.
    client.emit(sdkEvent("task_completed", task.id, { totalCost: 1 }));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(onWorkspaceUpdate).toHaveBeenCalledTimes(notifyAfterRemove);

    client.close(task.id);
    unsubscribe();
  });

  it("workspace createTask preserves the explicit prompt argument", async () => {
    const client = new TestClient(["task-prompt"]);
    const workspace = new WorkspaceRuntime({
      apiKey: "test-key",
      client,
      permissionStore: new MemoryPermissionStore(),
    });

    await workspace.createTask("explicit prompt", {
      prompt: "stale override",
    });

    expect(client.createTaskCalls[0]?.prompt).toBe("explicit prompt");
  });
});
