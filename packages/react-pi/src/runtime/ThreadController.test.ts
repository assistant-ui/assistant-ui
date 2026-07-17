import { describe, expect, it, vi } from "vitest";
import type { AppendMessage } from "@assistant-ui/react";
import { PiThreadController } from "./ThreadController";
import type {
  PiClient,
  PiClientEvent,
  PiClientEventBody,
  PiAssistantMessage,
  PiHostUiRequest,
  PiSendMessageInput,
  PiThreadSnapshot,
} from "../types";

const THREAD = "t1";

const snapshot = (over: Partial<PiThreadSnapshot> = {}): PiThreadSnapshot => ({
  metadata: { id: THREAD, status: "idle" },
  messages: [],
  ...over,
});

type FakeClient = PiClient & {
  emit: (event: PiClientEvent) => void;
  listeners: Set<(e: PiClientEvent) => void>;
  subscribed: number;
  subscribeOptions: Array<{ includeSnapshot?: boolean } | undefined>;
  unsubscribed: number;
  sent: Array<{ threadId: string; input: PiSendMessageInput }>;
  cancelled: string[];
  queueCleared: string[];
  clearQueueResult: { steering: string[]; followUp: string[] };
  modelChanges: Array<{ threadId: string; provider: string; modelId: string }>;
  thinkingChanges: Array<{ threadId: string; level: string }>;
  hostUiResponses: Array<{ threadId: string; response: unknown }>;
  getThreadSnapshot: PiThreadSnapshot;
};

const createFakeClient = (
  initial: PiThreadSnapshot = snapshot(),
): FakeClient => {
  const listeners = new Set<(e: PiClientEvent) => void>();
  const client: FakeClient = {
    listeners,
    subscribed: 0,
    subscribeOptions: [],
    unsubscribed: 0,
    sent: [],
    cancelled: [],
    queueCleared: [],
    clearQueueResult: { steering: [], followUp: [] },
    modelChanges: [],
    thinkingChanges: [],
    hostUiResponses: [],
    getThreadSnapshot: initial,
    emit(event) {
      for (const l of listeners) l(event);
    },
    async listThreads() {
      return [];
    },
    async createThread() {
      return snapshot();
    },
    async getThread() {
      return client.getThreadSnapshot;
    },
    async sendMessage(threadId, input) {
      client.sent.push({ threadId, input });
    },
    async cancelRun(threadId) {
      client.cancelled.push(threadId);
    },
    async clearQueue(threadId) {
      client.queueCleared.push(threadId);
      return client.clearQueueResult;
    },
    async getAvailableModels() {
      return [];
    },
    async setModel(threadId, input) {
      client.modelChanges.push({ threadId, ...input });
    },
    async setThinkingLevel(threadId, level) {
      client.thinkingChanges.push({ threadId, level });
    },
    async renameThread() {},
    async archiveThread() {},
    async unarchiveThread() {},
    async deleteThread() {},
    async respondToHostUiRequest(threadId, response) {
      client.hostUiResponses.push({ threadId, response });
    },
    subscribe(_threadId, listener, options) {
      client.subscribed += 1;
      client.subscribeOptions.push(options);
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        client.unsubscribed += 1;
      };
    },
  };
  return client;
};

const assistantMessage = (text: string, timestamp = 1): PiAssistantMessage => ({
  role: "assistant",
  content: [{ type: "text", text }],
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
  timestamp,
});

const userMessage = (
  text: string,
  over: Partial<AppendMessage> = {},
): AppendMessage =>
  ({
    role: "user",
    content: [{ type: "text", text }],
    attachments: [],
    parentId: null,
    sourceId: null,
    runConfig: {},
    ...over,
  }) as AppendMessage;

const ev = (body: PiClientEventBody, seq: number): PiClientEvent =>
  ({ ...body, threadId: THREAD, seq }) as PiClientEvent;

describe("PiThreadController", () => {
  it("seeds state from a snapshot on load and flips loadState", async () => {
    const client = createFakeClient(
      snapshot({
        metadata: { id: THREAD, status: "running", title: "Hi" },
        messages: [{ role: "user", content: "hello", timestamp: 1 }],
      }),
    );
    const controller = new PiThreadController(client, THREAD);
    expect(controller.getState().loadState).toBe("pending");

    await controller.load();

    const state = controller.getState();
    expect(state.loadState).toBe("loaded");
    expect(state.runStatus).toBe("running");
    expect(state.metadata.title).toBe("Hi");
    expect(state.messages).toHaveLength(1);
  });

  it("records the error and stays loaded when getThread rejects", async () => {
    const client = createFakeClient();
    client.getThread = async () => {
      throw new Error("boom");
    };
    const controller = new PiThreadController(client, THREAD);

    await expect(controller.load()).rejects.toThrow("boom");
    expect(controller.getState().lastError).toBe("boom");
    expect(controller.getState().loadState).toBe("loaded");
  });

  it("applies subscribed events and notifies listeners", () => {
    const client = createFakeClient();
    const controller = new PiThreadController(client, THREAD);
    const notify = vi.fn();
    controller.subscribe(notify);
    controller.connect();

    client.emit(ev({ type: "agent_start" }, 1));
    expect(controller.getState().runStatus).toBe("running");
    expect(notify).toHaveBeenCalledTimes(1);

    client.emit(
      ev(
        {
          type: "message_start",
          message: { role: "user", content: "hi", timestamp: 1 },
        },
        2,
      ),
    );
    expect(controller.getState().messages).toHaveLength(1);
    expect(notify).toHaveBeenCalledTimes(2);
  });

  it("ignores events addressed to a different thread", () => {
    const client = createFakeClient();
    const controller = new PiThreadController(client, THREAD);
    controller.connect();
    client.emit({ type: "agent_start", threadId: "other", seq: 1 });
    expect(controller.getState().runStatus).toBe("idle");
  });

  it("sends an idle message with no streamingBehavior", async () => {
    const client = createFakeClient();
    const controller = new PiThreadController(client, THREAD);
    await controller.sendMessage(userMessage("go"));
    expect(client.sent[0]!.input).toEqual({ content: "go" });
  });

  it("derives followUp while running and honors a steer runConfig", async () => {
    const client = createFakeClient();
    const controller = new PiThreadController(client, THREAD);
    controller.connect();
    client.emit(ev({ type: "agent_start" }, 1));

    await controller.sendMessage(userMessage("queued"));
    expect(client.sent[0]!.input.streamingBehavior).toBe("followUp");

    await controller.sendMessage(
      userMessage("now", {
        runConfig: { custom: { streamingBehavior: "steer" } },
      }),
    );
    expect(client.sent[1]!.input.streamingBehavior).toBe("steer");
  });

  it("treats a locally accepted send as running before Pi emits agent_start", async () => {
    const client = createFakeClient();
    const controller = new PiThreadController(client, THREAD);
    controller.subscribe(() => {});

    await controller.sendMessage(userMessage("first"));
    await controller.sendMessage(userMessage("second"));

    expect(client.sent).toHaveLength(2);
    expect(client.sent[0]!.input).toEqual({ content: "first" });
    expect(client.sent[1]!.input).toEqual({
      content: "second",
      streamingBehavior: "followUp",
    });
  });

  it("maps image attachments to Pi image content", async () => {
    const client = createFakeClient();
    const controller = new PiThreadController(client, THREAD);
    await controller.sendMessage(
      userMessage("look", {
        content: [
          { type: "text", text: "look" },
          { type: "image", image: "data:image/png;base64,AAAA" },
        ],
      } as Partial<AppendMessage>),
    );
    expect(client.sent[0]!.input.attachments).toEqual([
      { type: "image", mimeType: "image/png", data: "AAAA" },
    ]);
  });

  it("cancels the run via the client", async () => {
    const client = createFakeClient();
    const controller = new PiThreadController(client, THREAD);
    await controller.cancel();
    expect(client.cancelled).toEqual([THREAD]);
  });

  it("sets model and thinking level via the client", async () => {
    const client = createFakeClient();
    const controller = new PiThreadController(client, THREAD);

    await controller.setModel({ provider: "anthropic", modelId: "claude" });
    await controller.setThinkingLevel("high");

    expect(client.modelChanges).toEqual([
      { threadId: THREAD, provider: "anthropic", modelId: "claude" },
    ]);
    expect(client.thinkingChanges).toEqual([
      { threadId: THREAD, level: "high" },
    ]);
  });

  it("answers a tool approval and optimistically clears the request", async () => {
    const request: PiHostUiRequest = {
      id: "r1",
      kind: "confirm",
      title: "Run?",
      message: "ok?",
      toolCallId: "tc1",
    };
    const client = createFakeClient();
    const controller = new PiThreadController(client, THREAD);
    controller.connect();
    client.emit(ev({ type: "extension_ui_request", request }, 1));
    expect(controller.getState().hostUiRequests).toHaveLength(1);

    await controller.respondToToolApproval("r1", true);
    expect(client.hostUiResponses[0]!.response).toEqual({
      requestId: "r1",
      confirmed: true,
    });
    expect(controller.getState().hostUiRequests).toHaveLength(0);
  });

  it("resumes a tool-call interrupt by toolCallId", async () => {
    const request: PiHostUiRequest = {
      id: "r2",
      kind: "input",
      title: "Name?",
      toolCallId: "tc9",
    };
    const client = createFakeClient();
    const controller = new PiThreadController(client, THREAD);
    controller.connect();
    client.emit(ev({ type: "extension_ui_request", request }, 1));

    await controller.resumeToolCall("tc9", "Ada");
    expect(client.hostUiResponses[0]!.response).toEqual({
      requestId: "r2",
      value: "Ada",
    });
    expect(controller.getState().hostUiRequests).toHaveLength(0);
  });

  it("throws when resuming an unknown tool call", async () => {
    const client = createFakeClient();
    const controller = new PiThreadController(client, THREAD);
    await expect(controller.resumeToolCall("nope", "x")).rejects.toThrow(
      /No pending host-UI request/,
    );
  });

  it("defers disconnecting when the last listener unsubscribes (disconnect ≠ abort)", () => {
    vi.useFakeTimers();
    const client = createFakeClient();
    const controller = new PiThreadController(client, THREAD);
    const unsub = controller.subscribe(() => {});
    unsub();
    expect(client.subscribed).toBe(0);
    expect(client.unsubscribed).toBe(0);

    vi.advanceTimersByTime(30_000);
    expect(client.unsubscribed).toBe(0);
    expect(client.cancelled).toEqual([]);

    vi.useRealTimers();
  });

  it("keeps the event subscription while the active runtime retains it", () => {
    vi.useFakeTimers();
    const client = createFakeClient();
    const controller = new PiThreadController(client, THREAD);
    const release = controller.connect();
    const unsub = controller.subscribe(() => {});

    unsub();
    vi.advanceTimersByTime(30_000);
    expect(client.unsubscribed).toBe(0);

    release();
    vi.advanceTimersByTime(30_000);
    expect(client.unsubscribed).toBe(1);

    vi.useRealTimers();
  });

  it("keeps thread switching on the read-only getThread path", async () => {
    const client = createFakeClient(
      snapshot({ messages: [{ role: "user", content: "one", timestamp: 1 }] }),
    );
    const first = new PiThreadController(client, "thread-one");
    const second = new PiThreadController(client, "thread-two");
    first.subscribe(() => {});
    second.subscribe(() => {});

    await first.load();
    client.getThreadSnapshot = snapshot({
      metadata: { id: "thread-two", status: "idle" },
      messages: [{ role: "user", content: "two", timestamp: 2 }],
    });
    await second.load();

    expect(client.subscribed).toBe(0);
    expect(first.getState().messages[0]).toMatchObject({ content: "one" });
    expect(second.getState().messages[0]).toMatchObject({ content: "two" });
  });

  it("full-refreshes from a snapshot on an unrecognized event type", async () => {
    const client = createFakeClient(
      snapshot({ messages: [{ role: "user", content: "x", timestamp: 1 }] }),
    );
    const getThread = vi.spyOn(client, "getThread");
    const controller = new PiThreadController(client, THREAD);
    controller.connect();

    client.emit({
      type: "some_future_event",
      threadId: THREAD,
      seq: 1,
    } as unknown as PiClientEvent);

    // refreshInBackground → getThread; await the microtask queue to settle.
    await Promise.resolve();
    await Promise.resolve();
    expect(getThread).toHaveBeenCalled();
    expect(controller.getState().messages).toHaveLength(1);
  });

  it("does not refresh snapshots for settled or custom entry events", async () => {
    const client = createFakeClient();
    const getThread = vi.spyOn(client, "getThread");
    const controller = new PiThreadController(client, THREAD);
    controller.connect();

    client.emit(ev({ type: "agent_settled" }, 1));
    client.emit(
      ev(
        {
          type: "entry_appended",
          entry: {
            type: "custom",
            id: "entry-1",
            parentId: null,
            timestamp: "2026-07-18T00:00:00.000Z",
            customType: "extension-state",
            data: { enabled: true },
          },
        },
        2,
      ),
    );

    await Promise.resolve();
    await Promise.resolve();
    expect(getThread).not.toHaveBeenCalled();
    expect(controller.getState().lastSeq).toBe(2);
  });

  it("refreshes snapshots for appended entry variants without companion events", async () => {
    const client = createFakeClient();
    const getThread = vi.spyOn(client, "getThread");
    const controller = new PiThreadController(client, THREAD);
    controller.connect();

    client.emit(
      ev(
        {
          type: "entry_appended",
          entry: {
            type: "model_change",
            id: "entry-1",
            parentId: null,
            timestamp: "2026-07-18T00:00:00.000Z",
            provider: "anthropic",
            modelId: "claude-sonnet-4-5",
          },
        },
        1,
      ),
    );

    await Promise.resolve();
    await Promise.resolve();
    expect(getThread).toHaveBeenCalledOnce();
  });

  it("refreshes when an older server omits the appended entry payload", async () => {
    const client = createFakeClient();
    const getThread = vi.spyOn(client, "getThread");
    const controller = new PiThreadController(client, THREAD);
    controller.connect();

    client.emit({
      type: "entry_appended",
      threadId: THREAD,
      seq: 1,
    } as unknown as PiClientEvent);

    await Promise.resolve();
    await Promise.resolve();
    expect(getThread).toHaveBeenCalledOnce();
  });

  it("shows an optimistic user message before send resolves", async () => {
    const client = createFakeClient();
    let resolveSend!: () => void;
    client.sendMessage = async (threadId, input) => {
      client.sent.push({ threadId, input });
      await new Promise<void>((resolve) => {
        resolveSend = resolve;
      });
    };
    const controller = new PiThreadController(client, THREAD);
    const notify = vi.fn();
    controller.subscribe(notify);

    const send = controller.sendMessage(userMessage("instant"));

    expect(controller.getProjectedMessages()).toHaveLength(1);
    expect(controller.getProjectedMessages()[0]).toMatchObject({
      role: "user",
      content: [{ type: "text", text: "instant" }],
    });
    expect(controller.getVersion()).toBeGreaterThan(0);
    expect(notify).toHaveBeenCalled();
    expect(client.subscribed).toBe(1);
    expect(client.subscribeOptions[0]).toEqual({ includeSnapshot: false });

    resolveSend();
    await send;
  });

  it("rolls back the optimistic running mark when a send rejects", async () => {
    const client = createFakeClient();
    client.sendMessage = async () => {
      throw new Error("nope");
    };
    const controller = new PiThreadController(client, THREAD);

    await expect(controller.sendMessage(userMessage("hi"))).rejects.toThrow(
      "nope",
    );

    const state = controller.getState();
    expect(state.runStatus).toBe("failed");
    expect(state.metadata.status).toBe("failed");
    expect(state.lastError).toBe("nope");
    expect(controller.getProjectedMessages()).toHaveLength(0);
  });

  it("mirrors a mid-run send into the queue instead of the transcript", async () => {
    const client = createFakeClient();
    const controller = new PiThreadController(client, THREAD);
    controller.connect();
    client.emit(ev({ type: "agent_start" }, 1));

    await controller.sendMessage(userMessage("queued"));
    expect(controller.getProjectedMessages()).toHaveLength(0);
    expect(controller.getState().queue.followUp).toEqual(["queued"]);

    await controller.sendMessage(
      userMessage("now", {
        runConfig: { custom: { streamingBehavior: "steer" } },
      }),
    );
    expect(controller.getState().queue.steering).toEqual(["now"]);

    // Pi's authoritative queue_update replaces the optimistic mirror wholesale.
    client.emit(
      ev({ type: "queue_update", steering: ["now"], followUp: ["queued"] }, 2),
    );
    expect(controller.getState().queue).toEqual({
      steering: ["now"],
      followUp: ["queued"],
    });
  });

  it("rolls back the optimistic queue entry when a mid-run send rejects", async () => {
    const client = createFakeClient();
    const controller = new PiThreadController(client, THREAD);
    controller.connect();
    client.emit(ev({ type: "agent_start" }, 1));
    client.sendMessage = async () => {
      throw new Error("nope");
    };

    await expect(controller.sendMessage(userMessage("hi"))).rejects.toThrow(
      "nope",
    );

    const state = controller.getState();
    expect(state.queue.followUp).toEqual([]);
    expect(state.lastError).toBe("nope");
    // The run itself is unaffected by a failed enqueue.
    expect(state.runStatus).toBe("running");
  });

  it("clears the queue via the client and returns the cleared text", async () => {
    const client = createFakeClient();
    client.clearQueueResult = { steering: ["a"], followUp: ["b", "c"] };
    const controller = new PiThreadController(client, THREAD);
    controller.connect();
    client.emit(ev({ type: "agent_start" }, 1));
    await controller.sendMessage(userMessage("b"));

    const cleared = await controller.clearQueue();

    expect(client.queueCleared).toEqual([THREAD]);
    expect(cleared).toEqual({ steering: ["a"], followUp: ["b", "c"] });
    expect(controller.getState().queue).toEqual({
      steering: [],
      followUp: [],
    });
  });

  it("reconciles an optimistic message against an enriched echo", async () => {
    const client = createFakeClient();
    const controller = new PiThreadController(client, THREAD);
    controller.connect();

    await controller.sendMessage(userMessage("look"));
    expect(controller.getProjectedMessages()).toHaveLength(1);

    // The echoed transcript message carries array content with extra fields —
    // structurally different from the optimistic string content, same text.
    client.emit(
      ev(
        {
          type: "message_start",
          message: {
            role: "user",
            content: [
              { type: "text", text: "look" },
              { type: "image", data: "AAAA", mimeType: "image/png" },
            ],
            timestamp: 2,
          },
        },
        1,
      ),
    );

    const projected = controller.getProjectedMessages();
    expect(projected.filter((m) => m.role === "user")).toHaveLength(1);
  });

  it("coalesces high-frequency stream notifications", () => {
    const client = createFakeClient();
    const scheduled: Array<() => void> = [];
    const controller = new PiThreadController(client, THREAD, {
      scheduleNotify: (flush) => scheduled.push(flush),
    });
    const notify = vi.fn();
    controller.subscribe(notify);
    controller.connect();

    client.emit(
      ev(
        {
          type: "message_start",
          message: assistantMessage("", 1),
        },
        1,
      ),
    );
    notify.mockClear();

    for (let i = 0; i < 1000; i++) {
      client.emit(
        ev(
          {
            type: "message_update",
            message: assistantMessage(`token-${i}`, 1),
            assistantMessageEvent: {
              type: "text_delta",
              contentIndex: 0,
              delta: `token-${i}`,
              partial: assistantMessage(`token-${i}`, 1),
            },
          },
          i + 2,
        ),
      );
    }

    expect(scheduled).toHaveLength(1);
    expect(notify).not.toHaveBeenCalled();

    scheduled[0]!();

    expect(notify).toHaveBeenCalledTimes(1);
    expect(controller.getProjectedMessages()[0]!.content).toMatchObject([
      { type: "text", text: "token-999" },
    ]);
  });

  it("preserves unchanged projected message identities across a stream delta", () => {
    const client = createFakeClient(
      snapshot({
        messages: [{ role: "user", content: "stable", timestamp: 1 }],
      }),
    );
    const scheduled: Array<() => void> = [];
    const controller = new PiThreadController(client, THREAD, {
      scheduleNotify: (flush) => scheduled.push(flush),
    });
    controller.connect();

    client.emit(
      ev(
        {
          type: "snapshot",
          snapshot: client.getThreadSnapshot,
        },
        1,
      ),
    );
    client.emit(
      ev(
        {
          type: "message_start",
          message: assistantMessage("a", 2),
        },
        2,
      ),
    );

    const before = controller.getProjectedMessages();
    const stableUser = before[0]!;

    client.emit(
      ev(
        {
          type: "message_update",
          message: assistantMessage("ab", 2),
          assistantMessageEvent: {
            type: "text_delta",
            contentIndex: 0,
            delta: "b",
            partial: assistantMessage("ab", 2),
          },
        },
        3,
      ),
    );
    scheduled[0]!();

    const after = controller.getProjectedMessages();
    expect(after[0]).toBe(stableUser);
    expect(after[1]).not.toBe(before[1]);
    expect(after[1]!.content).toMatchObject([{ type: "text", text: "ab" }]);
  });
});
