import { describe, expect, it } from "vitest";
import { createAgentChatAdapter } from "../bridge/useAgentChatRuntime";
import type { AgentClientInterface } from "../sdk/HttpAgentClient";
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
    if (this.closed) return;
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
  public cancelCalls: string[] = [];

  constructor(taskIds: string[]) {
    this.nextTaskIds = [...taskIds];
  }

  async createTask(options: CreateTaskOptions): Promise<TaskHandle> {
    this.createTaskCalls.push(options);
    const taskId =
      this.nextTaskIds.shift() ?? `task-${this.createTaskCalls.length}`;
    this.getQueue(taskId);
    return { id: taskId, prompt: options.prompt };
  }

  async *streamEvents(taskId: string): AsyncGenerator<SDKEvent> {
    for await (const event of this.getQueue(taskId)) {
      yield event;
    }
  }

  async approveToolUse(): Promise<void> {}

  async cancelTask(taskId: string): Promise<void> {
    this.cancelCalls.push(taskId);
  }

  emit(event: SDKEvent): void {
    this.getQueue(event.taskId).push(event);
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

const sdkEvent = (
  type: SDKEventType,
  taskId: string,
  data: unknown,
  agentId?: string,
): SDKEvent => {
  const event: SDKEvent = {
    type,
    taskId,
    data,
    timestamp: new Date("2026-02-28T00:00:00.000Z"),
  };
  if (agentId) event.agentId = agentId;
  return event;
};

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

describe("thread-task binding", () => {
  it("binds tasks to threads in the workspace", async () => {
    const client = new TestClient(["task-1"]);
    const workspace = new WorkspaceRuntime({
      apiKey: "test",
      client,
    });

    const task = await workspace.createThreadTask("thread-1", "Inspect repo");

    expect(task.id).toBe("task-1");
    expect(workspace.getThreadTaskId("thread-1")).toBe("task-1");
    expect(workspace.getTaskByThreadId("thread-1")?.id).toBe("task-1");
  });

  it("reattaches to an active task for the same thread after detach", async () => {
    const client = new TestClient(["task-1"]);
    const workspace = new WorkspaceRuntime({
      apiKey: "test",
      client,
    });
    const adapter = createAgentChatAdapter(workspace);

    const abort1 = new AbortController();
    const run1 = adapter.run({
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: "Inspect repo" }],
        },
      ],
      abortSignal: abort1.signal,
      unstable_threadId: "thread-1",
    }) as AsyncGenerator<any, void>;

    const firstChunk = run1.next();
    await waitForCondition(() => client.createTaskCalls.length === 1);

    client.emit(
      sdkEvent(
        "agent_spawned",
        "task-1",
        { name: "Claude", parentAgentId: null },
        "agent-1",
      ),
    );
    client.emit(sdkEvent("message", "task-1", { text: "hello" }, "agent-1"));

    expect(await firstChunk).toMatchObject({
      value: {
        content: [{ type: "text", text: "hello" }],
      },
      done: false,
    });

    abort1.abort({ detach: true });
    expect(await run1.next()).toMatchObject({ done: true });
    expect(client.cancelCalls).toEqual([]);

    const abort2 = new AbortController();
    const run2 = adapter.run({
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: "Inspect repo" }],
        },
      ],
      abortSignal: abort2.signal,
      unstable_threadId: "thread-1",
    }) as AsyncGenerator<any, void>;

    expect(await run2.next()).toMatchObject({
      value: {
        content: [{ type: "text", text: "hello" }],
      },
      done: false,
    });
    expect(client.createTaskCalls).toHaveLength(1);

    const nextChunk = run2.next();
    client.emit(sdkEvent("message", "task-1", { text: " world" }, "agent-1"));

    expect(await nextChunk).toMatchObject({
      value: {
        content: [{ type: "text", text: "hello world" }],
      },
      done: false,
    });

    abort2.abort();
    await run2.next();
    expect(client.cancelCalls).toEqual(["task-1"]);
  });

  it("keeps concurrent tasks isolated per thread", async () => {
    const client = new TestClient(["task-1", "task-2"]);
    const workspace = new WorkspaceRuntime({
      apiKey: "test",
      client,
    });
    const adapter = createAgentChatAdapter(workspace);

    const run1 = adapter.run({
      messages: [
        { role: "user", content: [{ type: "text", text: "Thread one" }] },
      ],
      abortSignal: new AbortController().signal,
      unstable_threadId: "thread-1",
    }) as AsyncGenerator<any, void>;
    const run2 = adapter.run({
      messages: [
        { role: "user", content: [{ type: "text", text: "Thread two" }] },
      ],
      abortSignal: new AbortController().signal,
      unstable_threadId: "thread-2",
    }) as AsyncGenerator<any, void>;

    const first1 = run1.next();
    const first2 = run2.next();
    await waitForCondition(() => client.createTaskCalls.length === 2);

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
        "agent_spawned",
        "task-2",
        { name: "Claude", parentAgentId: null },
        "agent-2",
      ),
    );
    client.emit(sdkEvent("message", "task-1", { text: "one" }, "agent-1"));
    client.emit(sdkEvent("message", "task-2", { text: "two" }, "agent-2"));

    expect(await first1).toMatchObject({
      value: { content: [{ type: "text", text: "one" }] },
      done: false,
    });
    expect(await first2).toMatchObject({
      value: { content: [{ type: "text", text: "two" }] },
      done: false,
    });

    expect(workspace.getThreadTaskId("thread-1")).toBe("task-1");
    expect(workspace.getThreadTaskId("thread-2")).toBe("task-2");
    expect(workspace.getTaskByThreadId("thread-1")?.id).toBe("task-1");
    expect(workspace.getTaskByThreadId("thread-2")?.id).toBe("task-2");
  });
});
