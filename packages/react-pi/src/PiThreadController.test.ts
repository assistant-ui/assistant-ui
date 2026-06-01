import { describe, expect, it, vi } from "vitest";
import type { AppendMessage } from "@assistant-ui/react";
import { PiThreadController } from "./PiThreadController";
import type {
  PiClient,
  PiClientEvent,
  PiClientEventBody,
  PiHostUiRequest,
  PiSendMessageInput,
  PiThreadSnapshot,
} from "./piTypes";

const THREAD = "t1";

const snapshot = (over: Partial<PiThreadSnapshot> = {}): PiThreadSnapshot => ({
  metadata: { id: THREAD, status: "idle" },
  messages: [],
  ...over,
});

type FakeClient = PiClient & {
  emit: (event: PiClientEvent) => void;
  listeners: Set<(e: PiClientEvent) => void>;
  unsubscribed: number;
  sent: Array<{ threadId: string; input: PiSendMessageInput }>;
  cancelled: string[];
  hostUiResponses: Array<{ threadId: string; response: unknown }>;
  getThreadSnapshot: PiThreadSnapshot;
};

const createFakeClient = (
  initial: PiThreadSnapshot = snapshot(),
): FakeClient => {
  const listeners = new Set<(e: PiClientEvent) => void>();
  const client: FakeClient = {
    listeners,
    unsubscribed: 0,
    sent: [],
    cancelled: [],
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
    async renameThread() {},
    async respondToHostUiRequest(threadId, response) {
      client.hostUiResponses.push({ threadId, response });
    },
    subscribe(_threadId, listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        client.unsubscribed += 1;
      };
    },
  };
  return client;
};

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
    controller.subscribe(() => {});
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
    controller.subscribe(() => {});
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
    controller.subscribe(() => {});
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
    controller.subscribe(() => {});
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

  it("does not cancel the run when the last listener unsubscribes (disconnect ≠ abort)", () => {
    const client = createFakeClient();
    const controller = new PiThreadController(client, THREAD);
    const unsub = controller.subscribe(() => {});
    unsub();
    expect(client.unsubscribed).toBe(1);
    expect(client.cancelled).toEqual([]);
  });

  it("full-refreshes from a snapshot on an unrecognized event type", async () => {
    const client = createFakeClient(
      snapshot({ messages: [{ role: "user", content: "x", timestamp: 1 }] }),
    );
    const getThread = vi.spyOn(client, "getThread");
    const controller = new PiThreadController(client, THREAD);
    controller.subscribe(() => {});

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
});
