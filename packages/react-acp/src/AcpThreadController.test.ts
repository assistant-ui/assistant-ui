import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  AppendMessage,
  ThreadHistoryAdapter,
  ThreadMessage,
} from "@assistant-ui/core";
import { AcpThreadController } from "./AcpThreadController";
import {
  AcpClient,
  cancelPermissionHandler,
  type AcpWebSocketLike,
} from "./AcpClient";
import { toThreadMessage } from "./acpMessageProjection";
import type {
  AcpConnectionState,
  AcpPermissionRequest,
  AcpSessionUpdate,
  AcpToolCallStatus,
} from "./types";
import type { AcpAssistantMessage } from "./acpThreadState";

type PermissionHandler = (
  request: AcpPermissionRequest,
) => Promise<
  { outcome: "cancelled" } | { outcome: "selected"; optionId: string }
>;

class FakeClient {
  connectionState: AcpConnectionState = "disconnected";
  sessionId: string | undefined = undefined;
  agentInfo: { name: string; version: string } | undefined = undefined;
  agentCapabilities: Record<string, unknown> | undefined = undefined;
  onSessionUpdate:
    | ((sessionId: string, update: AcpSessionUpdate) => void)
    | undefined = undefined;
  onConnectionChange: ((state: AcpConnectionState) => void) | undefined =
    undefined;
  permissionHandler: PermissionHandler | undefined = undefined;

  connectCalls = 0;
  cancelCalls = 0;
  log: string[] | undefined = undefined;
  prompts: unknown[][] = [];
  stopReason: string = "end_turn";
  promptError: Error | undefined = undefined;
  promptGate: (() => void) | undefined = undefined;

  private release: (() => void) | undefined = undefined;

  async connect() {
    this.connectCalls += 1;
    this.connectionState = "connected";
    this.sessionId = "s1";
    this.agentInfo = { name: "fake-agent", version: "0.0.1" };
    this.onConnectionChange?.("connected");
    return {
      protocolVersion: 1,
      agentCapabilities: {},
      agentInfo: this.agentInfo,
    };
  }

  async prompt(blocks: unknown[]) {
    this.prompts.push(blocks);
    this.log?.push("prompt:send");
    if (this.promptGate) {
      await new Promise<void>((resolve) => {
        this.release = resolve;
      });
    }
    if (this.promptError) throw this.promptError;
    this.log?.push("prompt:settled");
    return this.stopReason;
  }

  async cancel() {
    this.cancelCalls += 1;
    this.log?.push("client.cancel");
    this.release?.();
    this.release = undefined;
  }

  emit(update: AcpSessionUpdate) {
    this.onSessionUpdate?.(this.sessionId ?? "", update);
  }

  ask(request: AcpPermissionRequest) {
    if (!this.permissionHandler) throw new Error("no permission handler");
    return this.permissionHandler(request);
  }

  unblock() {
    this.release?.();
    this.release = undefined;
  }
}

const fakeClient = () => new FakeClient();
const asClient = (client: FakeClient) => client as unknown as AcpClient;

const controller = (
  client: FakeClient,
  options: Partial<ConstructorParameters<typeof AcpThreadController>[0]> = {},
) => new AcpThreadController({ client: asClient(client), ...options });

const userAppend = (
  text: string,
  over: Partial<AppendMessage> = {},
): AppendMessage => ({
  role: "user",
  createdAt: new Date(0),
  content: [{ type: "text", text }],
  attachments: [],
  metadata: { custom: {} },
  parentId: null,
  sourceId: null,
  runConfig: undefined,
  ...over,
});

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const assistantOf = (c: AcpThreadController): AcpAssistantMessage => {
  const state = c.getState();
  for (const id of [...state.messageOrder].reverse()) {
    const message = state.messagesById[id];
    if (message?.role === "assistant") return message;
  }
  throw new Error("no assistant message");
};

const permissionRequest = (toolCallId = "t1"): AcpPermissionRequest => ({
  sessionId: "s1",
  toolCall: { toolCallId, title: "Delete file", status: "in_progress" },
  options: [
    { optionId: "allow", name: "Allow", kind: "allow_once" },
    { optionId: "reject", name: "Reject", kind: "reject_once" },
  ],
});

const toolStatus = (c: AcpThreadController, toolCallId = "t1") => {
  const part = assistantOf(c).content.find(
    (p) => p.type === "tool-call" && p.toolCallId === toolCallId,
  );
  return part?.type === "tool-call" ? part : undefined;
};

type FakeHistory = ThreadHistoryAdapter & {
  appended: unknown[];
  loadCalls: number;
};

const historyAdapter = (): FakeHistory => {
  const adapter = {
    appended: [] as unknown[],
    loadCalls: 0,
    load: async () => {
      adapter.loadCalls += 1;
      return { messages: [] as never[], headId: null };
    },
    append: async (item: unknown) => {
      adapter.appended.push(item);
    },
  };
  return adapter as unknown as FakeHistory;
};

let client: FakeClient;

beforeEach(() => {
  client = fakeClient();
});

describe("AcpThreadController", () => {
  it("wires and unwires client handlers on attach/detach", async () => {
    const c = controller(client);
    await c.attach();
    expect(client.onSessionUpdate).toBeDefined();
    expect(client.onConnectionChange).toBeDefined();
    expect(client.permissionHandler).toBeDefined();
    expect(c.getState().connectionState).toBe("disconnected");

    await c.attach();
    await c.detach();
    expect(client.onSessionUpdate).toBeUndefined();
    expect(client.onConnectionChange).toBeUndefined();
    expect(client.permissionHandler).toBe(cancelPermissionHandler);
  });

  it("connects on load and records the handshake", async () => {
    const c = controller(client);
    await c.attach();
    await c.load();

    expect(client.connectCalls).toBe(1);
    const state = c.getState();
    expect(state.loadState).toEqual({ type: "ready" });
    expect(state.sessionId).toBe("s1");
    expect(state.agentInfo).toEqual({ name: "fake-agent", version: "0.0.1" });

    await c.load();
    expect(client.connectCalls).toBe(1);
  });

  it("skips connecting when autoConnect is false", async () => {
    const c = controller(client, { autoConnect: false });
    await c.attach();
    await c.load();
    expect(client.connectCalls).toBe(0);
    expect(c.getState().loadState).toEqual({ type: "ready" });
  });

  it("reports a connect failure through onError and keeps loading usable", async () => {
    const onError = vi.fn();
    const failing = fakeClient();
    failing.connect = async () => {
      throw new Error("no socket");
    };
    const c = controller(failing, { onError });
    await c.attach();
    await c.load();

    expect(onError).toHaveBeenCalledWith(new Error("no socket"));
    expect(c.getState().loadState).toEqual({ type: "ready" });
  });

  it("appends a user message, runs a turn and streams the reply", async () => {
    client.promptGate = () => {};
    const c = controller(client);
    await c.attach();
    await c.load();

    const done = c.append(userAppend("hello"));
    await flush();
    expect(c.getState().run.type).toBe("running");

    client.emit({
      sessionUpdate: "agent_message_chunk",
      content: { type: "text", text: "Hi there" },
    });
    client.unblock();
    await done;

    const message = assistantOf(c);
    expect(message.status).toEqual({ type: "complete", reason: "stop" });
    expect(message.content).toEqual([{ type: "text", text: "Hi there" }]);
    expect(client.prompts).toEqual([[{ type: "text", text: "hello" }]]);
    expect(c.getState().run).toEqual({ type: "idle" });
  });

  it("does not start a run when startRun is false", async () => {
    const c = controller(client);
    await c.attach();
    await c.load();
    await c.append(userAppend("quiet", { startRun: false }));

    expect(client.prompts).toEqual([]);
    expect(c.getState().run).toEqual({ type: "idle" });
    expect(c.getState().messageOrder).toHaveLength(1);
  });

  it("maps a stop reason onto the assistant status", async () => {
    client.stopReason = "cancelled";
    const c = controller(client);
    await c.attach();
    await c.load();
    await c.append(userAppend("x"));

    expect(assistantOf(c).status).toEqual({
      type: "incomplete",
      reason: "cancelled",
    });
  });

  it("routes a prompt rejection to onError and marks the turn incomplete", async () => {
    const onError = vi.fn();
    client.promptError = new Error("agent exploded");
    const c = controller(client, { onError });
    await c.attach();
    await c.load();
    await c.append(userAppend("x"));

    expect(onError).toHaveBeenCalledWith(new Error("agent exploded"));
    expect(assistantOf(c).status).toEqual({
      type: "incomplete",
      reason: "error",
      error: "agent exploded",
    });
  });

  it("asks the user for permission and resolves with the chosen option", async () => {
    const c = controller(client);
    await c.attach();
    await c.load();

    client.promptGate = () => {};
    const done = c.append(userAppend("x"));
    await flush();
    const asked = client.ask(permissionRequest());

    expect(assistantOf(c).status).toEqual({
      type: "requires-action",
      reason: "tool-calls",
    });
    const approvalId = toolStatus(c)!.approval!.id;

    await c.respondToApproval({ approvalId, approved: true });
    await expect(asked).resolves.toEqual({
      outcome: "selected",
      optionId: "allow",
    });
    expect(toolStatus(c)!.approval).toMatchObject({
      approved: true,
      optionId: "allow",
    });
    expect(assistantOf(c).status).toEqual({ type: "running" });

    client.unblock();
    await done;
  });

  it("sends the reject option when the user declines", async () => {
    const c = controller(client);
    await c.attach();
    await c.load();

    client.promptGate = () => {};
    const done = c.append(userAppend("x"));
    await flush();
    const asked = client.ask(permissionRequest());
    await flush();

    const approvalId = toolStatus(c)!.approval!.id;
    await c.respondToApproval({ approvalId, approved: false });
    await expect(asked).resolves.toEqual({
      outcome: "selected",
      optionId: "reject",
    });
    expect(toolStatus(c)!.approval).toMatchObject({
      approved: false,
      optionId: "reject",
    });

    client.unblock();
    await done;
  });

  it("ignores a response for an unknown approval", async () => {
    const c = controller(client);
    await c.attach();
    await c.load();
    await expect(
      c.respondToApproval({ approvalId: "nope", approved: true }),
    ).resolves.toBeUndefined();
  });

  it("auto-allows in auto-allow mode without touching thread state", async () => {
    const c = controller(client, { permissions: "auto-allow" });
    await c.attach();
    await c.load();

    client.promptGate = () => {};
    const done = c.append(userAppend("x"));
    await expect(client.ask(permissionRequest())).resolves.toEqual({
      outcome: "selected",
      optionId: "allow",
    });
    expect(c.getState().permissions).toEqual({});
    expect(assistantOf(c).status).toEqual({ type: "running" });

    client.unblock();
    await done;
  });

  it("cancels a permission request that arrives outside a run", async () => {
    const c = controller(client);
    await c.attach();
    await c.load();
    await expect(client.ask(permissionRequest())).resolves.toEqual({
      outcome: "cancelled",
    });
  });

  it("cancels the turn on the wire before invoking onCancel", async () => {
    const calls: string[] = [];
    client.log = calls;
    const onCancel = () => calls.push("onCancel");
    const c = controller(client, { onCancel });
    await c.attach();
    await c.load();

    client.promptGate = () => {};
    const done = c.append(userAppend("x"));
    await flush();
    const asked = client.ask(permissionRequest());
    await flush();

    const cancelPromise = c.cancel();
    await expect(asked).resolves.toEqual({ outcome: "cancelled" });
    await cancelPromise;
    await done;

    expect(client.cancelCalls).toBe(1);
    expect(
      calls.filter(
        (entry) => entry === "client.cancel" || entry === "onCancel",
      ),
    ).toEqual(["client.cancel", "onCancel"]);
    expect(assistantOf(c).status).toEqual({
      type: "incomplete",
      reason: "cancelled",
    });
    expect(toolStatus(c)!.approval?.resolution).toBe("cancelled");
  });

  it("does nothing when cancelling an idle thread", async () => {
    const onCancel = vi.fn();
    const c = controller(client, { onCancel });
    await c.attach();
    await c.load();
    await c.cancel();
    expect(client.cancelCalls).toBe(0);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("supersedes an in-flight run when a new message is appended", async () => {
    const c = controller(client);
    await c.attach();
    await c.load();

    client.promptGate = () => {};
    const first = c.append(userAppend("1"));
    await flush();
    const firstAssistantId = assistantOf(c).id;

    client.promptGate = undefined;
    const second = c.append(userAppend("2"));
    await first;
    await second;

    expect(client.cancelCalls).toBe(1);
    const state = c.getState();
    expect(state.messagesById[firstAssistantId]!.role).toBe("assistant");
    expect(assistantOf(c).status).toEqual({ type: "complete", reason: "stop" });
    expect(client.prompts).toHaveLength(2);
  });

  it("reloads from the last user message before the given parent", async () => {
    const c = controller(client);
    await c.attach();
    await c.load();
    await c.append(userAppend("again"));

    const assistantId = assistantOf(c).id;
    client.prompts.length = 0;
    await c.reload(assistantId);

    expect(client.prompts).toEqual([[{ type: "text", text: "again" }]]);
    expect(client.prompts).toHaveLength(1);
  });

  it("does nothing when reloading an unknown message", async () => {
    const c = controller(client);
    await c.attach();
    await c.load();
    await c.reload("missing");
    expect(client.prompts).toEqual([]);
  });

  it("loads history and records new messages through the adapter", async () => {
    const history = historyAdapter();
    const c = controller(client, { history });
    await c.attach();
    await c.load();

    await c.append(userAppend("persist"));
    expect(history.appended).toHaveLength(2);
    const [userItem, assistantItem] = history.appended as [
      { parentId: string | null; message: ThreadMessage },
      { parentId: string | null; message: ThreadMessage },
    ];
    expect(userItem.parentId).toBeNull();
    expect(userItem.message.role).toBe("user");
    expect(assistantItem.parentId).toBe(userItem.message.id);
    expect(assistantItem.message.role).toBe("assistant");
  });

  it("reloads when a history adapter is supplied later", async () => {
    const c = controller(client);
    await c.attach();
    await c.load();
    expect(c.getState().messageOrder).toEqual([]);

    const history = historyAdapter();
    await c.updateOptions({ client: asClient(client), history });
    await c.load();
    expect(history.loadCalls).toBe(1);
  });

  it("routes a history load rejection through onError", async () => {
    const onError = vi.fn();
    const history: ThreadHistoryAdapter = {
      load: async () => {
        throw new Error("history unavailable");
      },
    } as never;
    const c = controller(client, { history, onError });
    await c.attach();
    await c.load();

    expect(onError).toHaveBeenCalledWith(new Error("history unavailable"));
    expect(c.getState().loadState).toEqual({ type: "ready" });
  });

  it("replaces thread state from external messages", async () => {
    const c = controller(client);
    await c.attach();
    await c.load();

    const now = new Date(0);
    await c.applyExternalMessages([
      {
        id: "u1",
        role: "user",
        createdAt: now,
        content: [{ type: "text", text: "external" }],
        metadata: { unstable_data: [], unstable_annotations: [] },
      } as unknown as ThreadMessage,
    ]);

    const state = c.getState();
    expect(state.messageOrder).toEqual(["u1"]);
    expect(state.headId).toBe("u1");
    expect(state.run).toEqual({ type: "idle" });
  });

  it("notifies subscribers and stops after dispose", async () => {
    const listener = vi.fn();
    const c = controller(client);
    const unsubscribe = c.subscribe(listener);
    await c.attach();
    await c.load();
    expect(listener).toHaveBeenCalled();

    listener.mockClear();
    unsubscribe();
    await c.load();
    expect(listener).not.toHaveBeenCalled();

    const second = vi.fn();
    c.subscribe(second);
    await c.dispose();
    expect(second).not.toHaveBeenCalled();
    expect(client.onSessionUpdate).toBeUndefined();
  });

  it("survives a throwing subscriber", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const c = controller(client);
    c.subscribe(() => {
      throw new Error("listener blew up");
    });
    const seen: string[] = [];
    c.subscribe(() => seen.push(c.getState().connectionState));
    await c.attach();
    await c.load();
    expect(seen).toContain("connected");
    errorSpy.mockRestore();
  });

  it("settles outstanding permissions on detach", async () => {
    const c = controller(client);
    await c.attach();
    await c.load();

    client.promptGate = () => {};
    const done = c.append(userAppend("x"));
    await flush();
    const asked = client.ask(permissionRequest());
    await flush();

    await c.detach();
    await expect(asked).resolves.toEqual({ outcome: "cancelled" });
    expect(toolStatus(c)!.approval?.resolution).toBe("cancelled");

    client.unblock();
    await done;
  });

  it("applies tool call updates to the running assistant message", async () => {
    const c = controller(client);
    await c.attach();
    await c.load();

    client.promptGate = () => {};
    const done = c.append(userAppend("x"));
    await flush();
    client.emit({
      sessionUpdate: "tool_call",
      toolCallId: "t1",
      title: "Search",
      status: "in_progress",
    });
    expect(toolStatus(c)!.toolName).toBe("Search");

    client.emit({
      sessionUpdate: "tool_call_update",
      toolCallId: "t1",
      status: "completed" as AcpToolCallStatus,
      rawOutput: { hits: 2 },
    });
    expect(toolStatus(c)!.result).toEqual({ hits: 2 });
    expect(toolStatus(c)!.isError).toBe(false);

    client.unblock();
    await done;
  });

  it("marks the run cancelled when detaching mid-turn", async () => {
    const c = controller(client);
    await c.attach();
    await c.load();

    client.promptGate = () => {};
    const done = c.append(userAppend("x"));
    await flush();
    expect(c.getState().run.type).toBe("running");

    await c.detach();

    expect(c.getState().run).toEqual({ type: "idle" });
    expect(assistantOf(c).status).toEqual({
      type: "incomplete",
      reason: "cancelled",
    });

    client.unblock();
    await done;
  });

  it("awaits the superseded prompt before starting the replacement run", async () => {
    const c = controller(client);
    await c.attach();
    await c.load();

    const order: string[] = [];
    client.log = order;
    client.promptGate = () => {};
    const first = c.append(userAppend("1"));
    await flush();
    expect(order).toEqual(["prompt:send"]);

    client.promptGate = undefined;
    const second = c.append(userAppend("2"));
    await first;
    await second;

    expect(order).toEqual([
      "prompt:send",
      "client.cancel",
      "prompt:settled",
      "prompt:send",
      "prompt:settled",
    ]);
  });

  it("loads a history adapter that replaces the one captured mid-load", async () => {
    let releaseFirst!: () => void;
    const first = {
      load: () =>
        new Promise((resolve) => {
          releaseFirst = () => resolve({ messages: [], headId: null });
        }),
    } as never as ThreadHistoryAdapter;
    const c = controller(client, { history: first });
    await c.attach();
    const firstLoad = c.load();
    await flush();

    const second = historyAdapter();
    await c.updateOptions({ client: asClient(client), history: second });
    const secondLoad = c.load();

    releaseFirst();
    await firstLoad;
    await secondLoad;

    expect(second.loadCalls).toBe(1);
  });

  it("sends composer attachments to the agent and keeps them in the transcript", async () => {
    const c = controller(client);
    await c.attach();
    await c.load();

    await c.append(
      userAppend("look", {
        attachments: [
          {
            id: "a1",
            type: "image",
            name: "cat.png",
            contentType: "image/png",
            status: { type: "complete" },
            content: [{ type: "image", image: "data:image/png;base64,QUJD" }],
          },
        ],
      }),
    );

    expect(client.prompts).toEqual([
      [
        { type: "text", text: "look" },
        { type: "image", data: "QUJD", mimeType: "image/png" },
      ],
    ]);

    const state = c.getState();
    const [userId] = state.messageOrder;
    const user = state.messagesById[userId!]!;
    expect(user.role).toBe("user");
    expect(user.role === "user" ? user.attachments : []).toHaveLength(1);
    expect(toThreadMessage(user).attachments).toHaveLength(1);
  });
});

type StubFrame = {
  id?: number | string;
  method?: string;
  params?: unknown;
};

class StubSocket implements AcpWebSocketLike {
  static instances: StubSocket[] = [];

  onopen: ((event?: unknown) => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onclose: ((event?: { code?: number; reason?: string }) => void) | null = null;
  onerror: ((event?: unknown) => void) | null = null;
  sent: StubFrame[] = [];

  constructor() {
    StubSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(JSON.parse(data) as StubFrame);
  }

  close() {}

  open() {
    this.onopen?.({});
  }

  find(method: string) {
    return this.sent.find((frame) => frame.method === method);
  }

  reply(id: number | string | undefined, result: unknown) {
    this.onmessage?.({ data: JSON.stringify({ jsonrpc: "2.0", id, result }) });
  }
}

const waitFor = async <T>(fn: () => T | undefined, ms = 2000): Promise<T> => {
  const start = Date.now();
  for (;;) {
    const value = fn();
    if (value !== undefined) return value;
    if (Date.now() - start > ms) throw new Error("timed out waiting");
    await new Promise((r) => setTimeout(r, 5));
  }
};

describe("AcpThreadController over a real AcpClient", () => {
  it("reports the session id that the first prompt creates lazily", async () => {
    StubSocket.instances = [];
    const client = new AcpClient({
      url: "ws://agent.test/",
      webSocketFactory: () => new StubSocket(),
    });
    const c = new AcpThreadController({ client });
    await c.attach();

    const loaded = c.load();
    const ws = StubSocket.instances.at(-1)!;
    ws.open();
    const initialize = await waitFor(() => ws.find("initialize"));
    ws.reply(initialize.id, {
      protocolVersion: 1,
      agentCapabilities: {},
      agentInfo: { name: "real-agent", version: "0.1.0" },
    });
    await loaded;

    expect(c.getState().connectionState).toBe("connected");
    expect(c.getState().sessionId).toBeUndefined();

    const done = c.append(userAppend("hi"));
    const newSession = await waitFor(() => ws.find("session/new"));
    ws.reply(newSession.id, { sessionId: "s1" });
    const prompt = await waitFor(() => ws.find("session/prompt"));
    ws.reply(prompt.id, { stopReason: "end_turn" });
    await done;

    expect(c.getState().sessionId).toBe("s1");
    expect(assistantOf(c).status).toEqual({ type: "complete", reason: "stop" });
  });
});
