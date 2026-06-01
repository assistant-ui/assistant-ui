import { describe, expect, it } from "vitest";
import {
  createPiThreadState,
  reducePiThreadState,
  type PiThreadState,
} from "./piThreadState";
import type {
  PiAssistantMessage,
  PiClientEvent,
  PiClientEventBody,
  PiThreadSnapshot,
  PiUserMessage,
} from "./piTypes";

let seq = 0;
const ev = (body: PiClientEventBody, threadId = "t1"): PiClientEvent =>
  ({ ...body, threadId, seq: ++seq }) as PiClientEvent;

const assistant = (
  content: PiAssistantMessage["content"],
  overrides: Partial<PiAssistantMessage> = {},
): PiAssistantMessage => ({
  role: "assistant",
  content,
  api: "anthropic-messages",
  provider: "anthropic",
  model: "claude",
  usage: {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens: 0,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
  },
  stopReason: "stop",
  timestamp: 1,
  ...overrides,
});

const user = (text: string): PiUserMessage => ({
  role: "user",
  content: text,
  timestamp: 0,
});

const apply = (state: PiThreadState, ...events: PiClientEvent[]) =>
  events.reduce(reducePiThreadState, state);

describe("piThreadState", () => {
  it("starts empty/pending", () => {
    const s = createPiThreadState("t1");
    expect(s.messages).toEqual([]);
    expect(s.loadState).toBe("pending");
    expect(s.runStatus).toBe("idle");
  });

  it("applies a snapshot wholesale and marks loaded", () => {
    const snapshot: PiThreadSnapshot = {
      metadata: { id: "t1", title: "Hi", status: "idle" },
      messages: [user("hello"), assistant([{ type: "text", text: "hi" }])],
    };
    const s = apply(
      createPiThreadState("t1"),
      ev({ type: "snapshot", snapshot }),
    );
    expect(s.messages).toHaveLength(2);
    expect(s.metadata.title).toBe("Hi");
    expect(s.loadState).toBe("loaded");
  });

  it("streams an assistant message: start → update → end (in-place)", () => {
    let s = apply(
      createPiThreadState("t1"),
      ev({ type: "agent_start" }),
      ev({ type: "message_start", message: assistant([]) }),
    );
    expect(s.runStatus).toBe("running");
    expect(s.streamingMessageIndex).toBe(0);

    const partial = assistant([{ type: "text", text: "hel" }]);
    s = apply(
      s,
      ev({
        type: "message_update",
        message: partial,
        assistantMessageEvent: {
          type: "text_delta",
          contentIndex: 0,
          delta: "hel",
          partial,
        },
      }),
    );
    // replaced in place, not appended
    expect(s.messages).toHaveLength(1);
    expect((s.messages[0] as PiAssistantMessage).content).toEqual([
      { type: "text", text: "hel" },
    ]);

    const final = assistant([{ type: "text", text: "hello" }]);
    s = apply(s, ev({ type: "message_end", message: final }));
    expect(s.messages).toHaveLength(1);
    expect(s.streamingMessageIndex).toBeUndefined();
    expect((s.messages[0] as PiAssistantMessage).content).toEqual([
      { type: "text", text: "hello" },
    ]);
  });

  it("appends non-assistant messages without taking the streaming slot", () => {
    const s = apply(
      createPiThreadState("t1"),
      ev({ type: "message_start", message: user("hello") }),
    );
    expect(s.messages).toHaveLength(1);
    expect(s.streamingMessageIndex).toBeUndefined();
  });

  it("tracks tool execution lifecycle by toolCallId", () => {
    let s = apply(
      createPiThreadState("t1"),
      ev({
        type: "tool_execution_start",
        toolCallId: "tc1",
        toolName: "bash",
        args: { command: "ls" },
      }),
    );
    expect(s.toolExecutions["tc1"]).toMatchObject({
      toolName: "bash",
      status: "running",
    });

    s = apply(
      s,
      ev({
        type: "tool_execution_update",
        toolCallId: "tc1",
        partialResult: { content: [{ type: "text", text: "file1\n" }] },
      }),
    );
    expect(s.toolExecutions["tc1"]?.partialResult).toEqual({
      content: [{ type: "text", text: "file1\n" }],
    });

    s = apply(
      s,
      ev({
        type: "tool_execution_end",
        toolCallId: "tc1",
        result: { content: [{ type: "text", text: "file1\nfile2\n" }] },
        isError: false,
      }),
    );
    expect(s.toolExecutions["tc1"]?.status).toBe("complete");
  });

  it("interleaves parallel tool executions independently", () => {
    const s = apply(
      createPiThreadState("t1"),
      ev({
        type: "tool_execution_start",
        toolCallId: "a",
        toolName: "bash",
        args: {},
      }),
      ev({
        type: "tool_execution_start",
        toolCallId: "b",
        toolName: "read",
        args: {},
      }),
      ev({
        type: "tool_execution_end",
        toolCallId: "b",
        result: {},
        isError: false,
      }),
    );
    expect(s.toolExecutions["a"]?.status).toBe("running");
    expect(s.toolExecutions["b"]?.status).toBe("complete");
  });

  it("updates queue from queue_update", () => {
    const s = apply(
      createPiThreadState("t1"),
      ev({ type: "queue_update", steering: ["s1"], followUp: ["f1", "f2"] }),
    );
    expect(s.queue).toEqual({ steering: ["s1"], followUp: ["f1", "f2"] });
  });

  it("tracks compaction and retry flags", () => {
    let s = apply(
      createPiThreadState("t1"),
      ev({ type: "compaction_start", reason: "threshold" }),
    );
    expect(s.compaction).toEqual({ active: true, reason: "threshold" });
    s = apply(
      s,
      ev({ type: "compaction_end", aborted: false, willRetry: false }),
    );
    expect(s.compaction.active).toBe(false);

    s = apply(s, ev({ type: "auto_retry_start", attempt: 2, delayMs: 500 }));
    expect(s.retry).toEqual({ active: true, attempt: 2 });
    s = apply(s, ev({ type: "auto_retry_end", success: true }));
    expect(s.retry.active).toBe(false);
  });

  it("agent_end with willRetry keeps running", () => {
    let s = apply(
      createPiThreadState("t1"),
      ev({ type: "agent_start" }),
      ev({ type: "agent_end", willRetry: true }),
    );
    expect(s.runStatus).toBe("running");
    s = apply(s, ev({ type: "agent_end", willRetry: false }));
    expect(s.runStatus).toBe("idle");
  });

  it("records errors and marks failed", () => {
    const s = apply(
      createPiThreadState("t1"),
      ev({ type: "error", error: "boom" }),
    );
    expect(s.lastError).toBe("boom");
    expect(s.runStatus).toBe("failed");
    expect(s.metadata.status).toBe("failed");
  });

  it("adds and resolves host-ui requests", () => {
    let s = apply(
      createPiThreadState("t1"),
      ev({
        type: "extension_ui_request",
        request: { id: "r1", kind: "confirm", title: "Run?", message: "ok?" },
      }),
    );
    expect(s.hostUiRequests).toHaveLength(1);
    // duplicate id is ignored
    s = apply(
      s,
      ev({
        type: "extension_ui_request",
        request: { id: "r1", kind: "confirm", title: "Run?", message: "ok?" },
      }),
    );
    expect(s.hostUiRequests).toHaveLength(1);
    s = apply(s, ev({ type: "extension_ui_resolved", requestId: "r1" }));
    expect(s.hostUiRequests).toHaveLength(0);
  });

  it("ignores stale non-snapshot events by seq but always applies snapshots", () => {
    const base = createPiThreadState("t1");
    const e1 = ev({ type: "agent_start" }); // seq N
    let s = reducePiThreadState(base, e1);
    const stale: PiClientEvent = {
      ...e1,
      type: "error",
      error: "old",
    } as PiClientEvent;
    // stale.seq === e1.seq <= lastSeq → ignored
    s = reducePiThreadState(s, stale);
    expect(s.lastError).toBeUndefined();

    // a snapshot with a low seq still applies
    const snapshot: PiThreadSnapshot = {
      metadata: { id: "t1", status: "idle" },
      messages: [user("x")],
    };
    s = reducePiThreadState(s, {
      type: "snapshot",
      snapshot,
      threadId: "t1",
      seq: 0,
    });
    expect(s.messages).toHaveLength(1);
  });

  it("tolerates unknown event types", () => {
    const before = apply(
      createPiThreadState("t1"),
      ev({ type: "agent_start" }),
    );
    const after = reducePiThreadState(before, {
      type: "totally_new_event",
      threadId: "t1",
      seq: ++seq,
      payload: 42,
    } as unknown as PiClientEvent);
    expect(after.runStatus).toBe(before.runStatus);
    expect(after.lastSeq).toBeGreaterThan(before.lastSeq);
  });

  it("reconnect snapshot clears streaming pointer and tool buffers", () => {
    let s = apply(
      createPiThreadState("t1"),
      ev({ type: "message_start", message: assistant([]) }),
      ev({
        type: "tool_execution_start",
        toolCallId: "tc1",
        toolName: "bash",
        args: {},
      }),
    );
    expect(s.streamingMessageIndex).toBe(0);
    expect(Object.keys(s.toolExecutions)).toHaveLength(1);

    const snapshot: PiThreadSnapshot = {
      metadata: { id: "t1", status: "running" },
      messages: [assistant([{ type: "text", text: "done" }])],
    };
    s = apply(s, ev({ type: "snapshot", snapshot }));
    expect(s.streamingMessageIndex).toBeUndefined();
    expect(Object.keys(s.toolExecutions)).toHaveLength(0);
    expect(s.runStatus).toBe("running");
  });
});
