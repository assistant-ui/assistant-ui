import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventEmitter } from "events";

// ---------------------------------------------------------------------------
// FakeChildProcess
// ---------------------------------------------------------------------------

class FakeChildProcess extends EventEmitter {
  stdin = { write: vi.fn() };
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  killed = false;
  pid = 12345;
  kill = vi.fn((_signal?: string) => {
    this.killed = true;
  });
}

// ---------------------------------------------------------------------------
// Readline mock — intercepts createInterface and exposes a lineHandler so
// tests can push JSON lines that the client will process.
// ---------------------------------------------------------------------------

let _lineHandler: ((line: string) => void) | null = null;

vi.mock("readline", () => ({
  createInterface: vi.fn(({ input }: { input: EventEmitter }) => {
    const rl = new EventEmitter();
    // When readline emits "line" on rl, forward to client's registered handler.
    // We capture the "line" listener the client registers.
    const originalOn = rl.on.bind(rl);
    rl.on = (event: string, listener: (...args: unknown[]) => void) => {
      if (event === "line") {
        _lineHandler = listener as (line: string) => void;
      }
      return originalOn(event, listener);
    };
    // Also listen to the input (stdout) for completeness — not used directly.
    void input;
    return rl;
  }),
}));

// ---------------------------------------------------------------------------
// child_process.spawn mock — returns a fresh FakeChildProcess per test.
// ---------------------------------------------------------------------------

let _fakeChild: FakeChildProcess | null = null;

vi.mock("child_process", () => ({
  spawn: vi.fn(() => {
    _fakeChild = new FakeChildProcess();
    return _fakeChild;
  }),
}));

// ---------------------------------------------------------------------------
// Import the module under test AFTER mocks are set up
// ---------------------------------------------------------------------------

import { CodexAgentClient } from "../sdk/CodexAgentClient";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Send a JSON-RPC response for the pending request with the given id. */
function sendResponse(id: number, result: unknown): void {
  const line = JSON.stringify({ jsonrpc: "2.0", id, result });
  _lineHandler!(line);
}

/** Send a JSON-RPC notification from the server. */
function sendNotification(method: string, params?: unknown): void {
  const line = JSON.stringify({ jsonrpc: "2.0", method, params });
  _lineHandler!(line);
}

/** Send a server-initiated JSON-RPC request (approval / user-input). */
function sendServerRequest(
  id: number | string,
  method: string,
  params?: unknown,
): void {
  const line = JSON.stringify({ jsonrpc: "2.0", id, method, params });
  _lineHandler!(line);
}

/**
 * Perform the three-step handshake that every CodexAgentClient task requires:
 *  1. Respond to "initialize" (request id 1)
 *  2. Respond to "thread/start"  (request id 2)
 *  3. Respond to "turn/start"    (request id 3)
 *
 * Returns after the client's runTask() has sent task_started into the queue.
 */
async function completeHandshake(): Promise<void> {
  // Give runTask() a tick to spawn + send the initialize request
  await Promise.resolve();
  sendResponse(1, { capabilities: {} });

  await Promise.resolve();
  sendResponse(2, { thread: { id: "thread-abc" } });

  await Promise.resolve();
  sendResponse(3, { turn: { id: "turn-xyz" } });

  // Let the microtask queue flush so task_started is pushed
  await new Promise((r) => setTimeout(r, 0));
}

/** Collect N events from the streamEvents generator. */
async function collectEvents(
  gen: AsyncGenerator<import("../runtime/types").SDKEvent>,
  n: number,
): Promise<import("../runtime/types").SDKEvent[]> {
  const events: import("../runtime/types").SDKEvent[] = [];
  for await (const ev of gen) {
    events.push(ev);
    if (events.length >= n) break;
  }
  return events;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CodexAgentClient", () => {
  let client: CodexAgentClient;

  beforeEach(() => {
    _fakeChild = null;
    _lineHandler = null;
    vi.clearAllMocks();
    client = new CodexAgentClient({ cwd: "/tmp/test" });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // 1. Initialize handshake sends correct JSON-RPC sequence
  // -------------------------------------------------------------------------
  it("sends initialize request then initialized notification during handshake", async () => {
    const handle = await client.createTask({ prompt: "hello" });

    // Allow spawn + initialize request to be written
    await Promise.resolve();

    const { write } = _fakeChild!.stdin;
    const calls = write.mock.calls.map((c: unknown[]) =>
      JSON.parse(c[0] as string),
    );

    // First write should be the initialize request
    const initReq = calls.find(
      (m: Record<string, unknown>) => m["method"] === "initialize" && "id" in m,
    );
    expect(initReq).toMatchObject({
      jsonrpc: "2.0",
      method: "initialize",
      params: {
        clientInfo: { name: "assistant-ui", version: "0.0.1" },
        capabilities: { experimentalApi: true },
      },
    });

    // Complete handshake to flush initialized notification
    await completeHandshake();

    const allCalls = write.mock.calls.map((c: unknown[]) =>
      JSON.parse(c[0] as string),
    );
    const initNotif = allCalls.find(
      (m: Record<string, unknown>) =>
        m["method"] === "initialized" && !("id" in m),
    );
    expect(initNotif).toMatchObject({ jsonrpc: "2.0", method: "initialized" });

    // Clean up — cancel so the generator terminates
    await client.cancelTask(handle.id);
  });

  // -------------------------------------------------------------------------
  // 2. createTask returns TaskHandle with id and prompt
  // -------------------------------------------------------------------------
  it("createTask returns a TaskHandle with id and prompt", async () => {
    const handle = await client.createTask({ prompt: "do the thing" });

    expect(handle.id).toBeTruthy();
    expect(handle.id).toMatch(/^task_/);
    expect(handle.prompt).toBe("do the thing");

    await client.cancelTask(handle.id);
  });

  // -------------------------------------------------------------------------
  // 3. streamEvents yields SDKEvents for content deltas
  // -------------------------------------------------------------------------
  it("streamEvents yields message_delta SDKEvents after handshake", async () => {
    const handle = await client.createTask({ prompt: "stream test" });
    await completeHandshake();

    const gen = client.streamEvents(handle.id);

    // Drain the handshake events (agent_spawned, task_started)
    // then push a delta notification
    const eventsPromise = (async () => {
      const collected: import("../runtime/types").SDKEvent[] = [];
      for await (const ev of gen) {
        collected.push(ev);
        if (ev.type === "message_delta") break;
      }
      return collected;
    })();

    sendNotification("item/agentMessage/delta", { delta: "Hello, world!" });

    const events = await eventsPromise;
    const delta = events.find((e) => e.type === "message_delta");
    expect(delta).toBeDefined();
    expect((delta!.data as { text: string }).text).toBe("Hello, world!");

    await client.cancelTask(handle.id);
  });

  // -------------------------------------------------------------------------
  // 4. agentId regression guard — every emitted SDKEvent has non-empty agentId
  // -------------------------------------------------------------------------
  it("every emitted SDKEvent carries a non-empty agentId", async () => {
    const handle = await client.createTask({ prompt: "agentId guard" });
    await completeHandshake();

    const gen = client.streamEvents(handle.id);

    const collectionPromise = (async () => {
      const collected: import("../runtime/types").SDKEvent[] = [];
      for await (const ev of gen) {
        collected.push(ev);
        // Collect agent_spawned + task_started + one message_delta
        if (ev.type === "message_delta") break;
      }
      return collected;
    })();

    sendNotification("item/agentMessage/delta", { delta: "test" });

    const events = await collectionPromise;

    // Must have at least agent_spawned and task_started
    expect(events.length).toBeGreaterThanOrEqual(2);
    for (const ev of events) {
      expect(typeof ev.agentId).toBe("string");
      expect(ev.agentId!.length).toBeGreaterThan(0);
    }

    await client.cancelTask(handle.id);
  });

  // -------------------------------------------------------------------------
  // 5. Content delta: item/agentMessage/delta → message_delta
  // -------------------------------------------------------------------------
  it("maps item/agentMessage/delta notification to message_delta SDKEvent", async () => {
    const handle = await client.createTask({ prompt: "delta test" });
    await completeHandshake();

    const gen = client.streamEvents(handle.id);

    const hitPromise = (async () => {
      for await (const ev of gen) {
        if (ev.type === "message_delta") return ev;
      }
    })();

    sendNotification("item/agentMessage/delta", { delta: "chunk text" });

    const ev = await hitPromise;
    expect(ev?.type).toBe("message_delta");
    expect((ev!.data as { text: string }).text).toBe("chunk text");

    await client.cancelTask(handle.id);
  });

  // -------------------------------------------------------------------------
  // 6. Tool-type item/started → tool_use; item/completed → tool_result
  // -------------------------------------------------------------------------
  it("maps tool-type item/started to tool_use and item/completed to tool_result", async () => {
    const handle = await client.createTask({ prompt: "tool test" });
    await completeHandshake();

    const gen = client.streamEvents(handle.id);

    const collectPromise = (async () => {
      const result: import("../runtime/types").SDKEvent[] = [];
      for await (const ev of gen) {
        if (ev.type === "tool_use" || ev.type === "tool_result") {
          result.push(ev);
          if (result.length >= 2) break;
        }
      }
      return result;
    })();

    sendNotification("item/started", {
      item: {
        id: "item-cmd-1",
        type: "command_execution",
        data: { command: "ls -la" },
      },
    });

    sendNotification("item/completed", {
      item: {
        id: "item-cmd-1",
        type: "command_execution",
        output: "total 0\n",
        status: "completed",
      },
    });

    const events = await collectPromise;

    expect(events[0]?.type).toBe("tool_use");
    const toolUseData = events[0]!.data as {
      toolCallId: unknown;
      toolName: string;
      toolInput: unknown;
    };
    expect(toolUseData.toolCallId).toBe("item-cmd-1");
    expect(toolUseData.toolName).toBe("command_execution");

    expect(events[1]?.type).toBe("tool_result");
    const toolResultData = events[1]!.data as {
      toolCallId: unknown;
      result: unknown;
      isError: boolean;
    };
    expect(toolResultData.toolCallId).toBe("item-cmd-1");
    expect(toolResultData.isError).toBe(false);

    await client.cancelTask(handle.id);
  });

  // -------------------------------------------------------------------------
  // 7. Non-tool item/started → item_started; item/completed → item_completed
  // -------------------------------------------------------------------------
  it("maps non-tool item/started to item_started and item/completed to item_completed", async () => {
    const handle = await client.createTask({ prompt: "non-tool item" });
    await completeHandshake();

    const gen = client.streamEvents(handle.id);

    const collectPromise = (async () => {
      const result: import("../runtime/types").SDKEvent[] = [];
      for await (const ev of gen) {
        if (ev.type === "item_started" || ev.type === "item_completed") {
          result.push(ev);
          if (result.length >= 2) break;
        }
      }
      return result;
    })();

    sendNotification("item/started", {
      item: {
        id: "item-msg-1",
        type: "agentMessage",
        title: "Agent Message",
      },
    });

    sendNotification("item/completed", {
      item: {
        id: "item-msg-1",
        type: "agentMessage",
        status: "completed",
      },
    });

    const events = await collectPromise;

    expect(events[0]?.type).toBe("item_started");
    const startedData = events[0]!.data as {
      itemId: unknown;
      itemType: string;
    };
    expect(startedData.itemId).toBe("item-msg-1");
    expect(startedData.itemType).toBe("agentMessage");

    expect(events[1]?.type).toBe("item_completed");
    const completedData = events[1]!.data as {
      itemId: unknown;
      status: string;
    };
    expect(completedData.itemId).toBe("item-msg-1");
    expect(completedData.status).toBe("completed");

    await client.cancelTask(handle.id);
  });

  // -------------------------------------------------------------------------
  // 8. Approval flow end-to-end
  // -------------------------------------------------------------------------
  it("approval flow: server request → tool_use_requested → approveToolUse → JSON-RPC response", async () => {
    const handle = await client.createTask({ prompt: "approval test" });
    await completeHandshake();

    const gen = client.streamEvents(handle.id);

    const approvalEventPromise = (async () => {
      for await (const ev of gen) {
        if (ev.type === "tool_use_requested") return ev;
      }
    })();

    // Server sends an approval server-request (has both method and id)
    sendServerRequest(99, "item/commandExecution/requestApproval", {
      command: "rm -rf /",
      reason: "Need to clean up",
    });

    const approvalEvent = await approvalEventPromise;
    expect(approvalEvent?.type).toBe("tool_use_requested");
    const approvalData = approvalEvent!.data as {
      approvalId: string;
      toolName: string;
      reason: string;
    };
    expect(approvalData.approvalId).toMatch(/^approval_/);
    expect(approvalData.toolName).toBe("rm -rf /");
    expect(approvalData.reason).toBe("Need to clean up");

    // Now approve
    await client.approveToolUse(handle.id, approvalData.approvalId, "allow");

    // Verify the response written to stdin contains correct JSON-RPC shape
    const writes = _fakeChild!.stdin.write.mock.calls.map((c: unknown[]) =>
      JSON.parse(c[0] as string),
    );
    const response = writes.find(
      (m: Record<string, unknown>) => m["id"] === 99 && "result" in m,
    );
    expect(response).toMatchObject({
      jsonrpc: "2.0",
      id: 99,
      result: { decision: "approve" },
    });

    await client.cancelTask(handle.id);
  });

  // -------------------------------------------------------------------------
  // 9. User input flow end-to-end
  // -------------------------------------------------------------------------
  it("user input flow: server request → user_input_requested → respondToUserInput → formatted response", async () => {
    const handle = await client.createTask({ prompt: "user input test" });
    await completeHandshake();

    const gen = client.streamEvents(handle.id);

    const inputEventPromise = (async () => {
      for await (const ev of gen) {
        if (ev.type === "user_input_requested") return ev;
      }
    })();

    sendServerRequest(55, "item/tool/requestUserInput", {
      questions: [{ id: "q1", text: "What is your name?" }],
    });

    const inputEvent = await inputEventPromise;
    expect(inputEvent?.type).toBe("user_input_requested");
    const inputData = inputEvent!.data as {
      requestId: string;
      questions: unknown[];
    };
    expect(inputData.requestId).toMatch(/^input_/);
    expect(inputData.questions).toHaveLength(1);

    await client.respondToUserInput!(handle.id, inputData.requestId, {
      q1: "Sam",
    });

    // Verify the response written to stdin has the correct answers format
    const writes = _fakeChild!.stdin.write.mock.calls.map((c: unknown[]) =>
      JSON.parse(c[0] as string),
    );
    const response = writes.find(
      (m: Record<string, unknown>) => m["id"] === 55 && "result" in m,
    );
    expect(response).toMatchObject({
      jsonrpc: "2.0",
      id: 55,
      result: { answers: { q1: { answers: ["Sam"] } } },
    });

    await client.cancelTask(handle.id);
  });

  // -------------------------------------------------------------------------
  // 10. Plan delta → plan_delta SDKEvent
  // -------------------------------------------------------------------------
  it("maps item/plan/delta notification to plan_delta SDKEvent", async () => {
    const handle = await client.createTask({ prompt: "plan delta test" });
    await completeHandshake();

    const gen = client.streamEvents(handle.id);

    const hitPromise = (async () => {
      for await (const ev of gen) {
        if (ev.type === "plan_delta") return ev;
      }
    })();

    sendNotification("item/plan/delta", {
      planId: "plan-001",
      delta: "Step 1: Do stuff",
    });

    const ev = await hitPromise;
    expect(ev?.type).toBe("plan_delta");
    const planData = ev!.data as { planId: string; text: string };
    expect(planData.planId).toBe("plan-001");
    expect(planData.text).toBe("Step 1: Do stuff");

    await client.cancelTask(handle.id);
  });

  // -------------------------------------------------------------------------
  // 11. Error with willRetry:true does NOT emit task_failed
  // -------------------------------------------------------------------------
  it("error with willRetry:true does not emit task_failed", async () => {
    const handle = await client.createTask({ prompt: "retry error test" });
    await completeHandshake();

    const gen = client.streamEvents(handle.id);

    // Collect events up to a subsequent delta to see what arrived
    const collectPromise = (async () => {
      const collected: import("../runtime/types").SDKEvent[] = [];
      for await (const ev of gen) {
        collected.push(ev);
        if (ev.type === "message_delta") break;
      }
      return collected;
    })();

    // Send retryable error — should be swallowed
    sendNotification("error", {
      willRetry: true,
      message: "Transient error, will retry",
    });

    // Send a subsequent delta to confirm the stream is still alive
    sendNotification("item/agentMessage/delta", { delta: "still alive" });

    const events = await collectPromise;
    const taskFailed = events.find((e) => e.type === "task_failed");
    expect(taskFailed).toBeUndefined();

    const delta = events.find((e) => e.type === "message_delta");
    expect(delta).toBeDefined();

    await client.cancelTask(handle.id);
  });

  // -------------------------------------------------------------------------
  // 12. Error with willRetry:false emits task_failed
  // -------------------------------------------------------------------------
  it("error with willRetry:false emits task_failed", async () => {
    const handle = await client.createTask({ prompt: "fatal error test" });
    await completeHandshake();

    const gen = client.streamEvents(handle.id);

    const hitPromise = (async () => {
      for await (const ev of gen) {
        if (ev.type === "task_failed") return ev;
      }
    })();

    sendNotification("error", {
      willRetry: false,
      message: "Fatal error occurred",
    });

    const ev = await hitPromise;
    expect(ev?.type).toBe("task_failed");
    expect((ev!.data as { reason: string }).reason).toBe(
      "Fatal error occurred",
    );

    await client.cancelTask(handle.id);
  });

  // -------------------------------------------------------------------------
  // 13. cancelTask sends SIGTERM
  // -------------------------------------------------------------------------
  it("cancelTask sends SIGTERM to the subprocess", async () => {
    const handle = await client.createTask({ prompt: "cancel test" });
    await completeHandshake();

    await client.cancelTask(handle.id);

    expect(_fakeChild!.kill).toHaveBeenCalledWith("SIGTERM");
  });

  // -------------------------------------------------------------------------
  // 14. Subprocess exit emits task_failed
  // -------------------------------------------------------------------------
  it("subprocess exit emits task_failed with exit code in reason", async () => {
    const handle = await client.createTask({ prompt: "exit test" });
    await completeHandshake();

    const gen = client.streamEvents(handle.id);

    const hitPromise = (async () => {
      for await (const ev of gen) {
        if (ev.type === "task_failed") return ev;
      }
    })();

    // Simulate subprocess exit
    _fakeChild!.emit("exit", 1);

    const ev = await hitPromise;
    expect(ev?.type).toBe("task_failed");
    expect((ev!.data as { reason: string }).reason).toContain("1");
  });

  // -------------------------------------------------------------------------
  // 15. respondToPlan emits local plan_approved SDKEvent
  // -------------------------------------------------------------------------
  it("respondToPlan('approve') emits a local plan_approved SDKEvent", async () => {
    const handle = await client.createTask({ prompt: "plan approve test" });
    await completeHandshake();

    const gen = client.streamEvents(handle.id);

    const hitPromise = (async () => {
      for await (const ev of gen) {
        if (ev.type === "plan_approved") return ev;
      }
    })();

    await client.respondToPlan!(handle.id, "plan-001", "approve");

    const ev = await hitPromise;
    expect(ev?.type).toBe("plan_approved");
    expect((ev!.data as { planId: string }).planId).toBe("plan-001");

    await client.cancelTask(handle.id);
  });

  // -------------------------------------------------------------------------
  // 16. turn/completed emits both agent_completed and task_completed
  // -------------------------------------------------------------------------
  it("turn/completed notification emits agent_completed then task_completed", async () => {
    const handle = await client.createTask({ prompt: "turn complete test" });
    await completeHandshake();

    const gen = client.streamEvents(handle.id);

    const collectPromise = (async () => {
      const result: import("../runtime/types").SDKEvent[] = [];
      for await (const ev of gen) {
        if (ev.type === "agent_completed" || ev.type === "task_completed") {
          result.push(ev);
          if (result.length >= 2) break;
        }
      }
      return result;
    })();

    sendNotification("turn/completed", {
      usage: { totalCostUsd: 0.0042 },
    });

    const events = await collectPromise;

    expect(events[0]?.type).toBe("agent_completed");
    const agentData = events[0]!.data as { name: string; finalCost: number };
    expect(agentData.name).toBe("Codex");
    expect(agentData.finalCost).toBeCloseTo(0.0042);

    expect(events[1]?.type).toBe("task_completed");
    const taskData = events[1]!.data as { totalCost: number };
    expect(taskData.totalCost).toBeCloseTo(0.0042);

    await client.cancelTask(handle.id);
  });
});
