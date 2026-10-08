import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppendMessage } from "@assistant-ui/core";
import { AcpThreadController } from "./AcpThreadController";
import { AcpClient, type AcpWebSocketLike } from "./AcpClient";
import { filterPromptBlocks } from "./conversions";
import { toThreadMessage } from "./acpMessageProjection";
import type {
  AcpConnectionState,
  AcpPermissionRequest,
  AcpSessionConfigOption,
  AcpSessionModeState,
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
  pendingCapabilities: Record<string, unknown> | undefined = undefined;
  configuredPermissionHandler: PermissionHandler | undefined = undefined;
  readonly permissionHandlers: PermissionHandler[] = [];
  resets = 0;
  modes: AcpSessionModeState | undefined = undefined;
  configOptions: readonly AcpSessionConfigOption[] | undefined = undefined;

  private readonly sessionUpdateListeners = new Set<
    (sessionId: string, update: AcpSessionUpdate) => void
  >();
  private readonly connectionListeners = new Set<
    (state: AcpConnectionState) => void
  >();

  connectCalls = 0;
  cancelCalls = 0;
  log: string[] | undefined = undefined;
  prompts: unknown[][] = [];
  stopReason: string = "end_turn";
  promptError: Error | undefined = undefined;
  promptGate: (() => void) | undefined = undefined;
  connectGate = false;
  cancelReleases = true;
  readonly releases: (() => void)[] = [];

  private release: (() => void) | undefined = undefined;
  private connectRelease: (() => void) | undefined = undefined;

  subscribeSessionUpdate(
    listener: (sessionId: string, update: AcpSessionUpdate) => void,
  ) {
    this.sessionUpdateListeners.add(listener);
    return () => {
      this.sessionUpdateListeners.delete(listener);
    };
  }

  subscribeConnectionChange(listener: (state: AcpConnectionState) => void) {
    this.connectionListeners.add(listener);
    return () => {
      this.connectionListeners.delete(listener);
    };
  }

  registerPermissionHandler(handler: PermissionHandler) {
    this.permissionHandlers.push(handler);
    return () => {
      const index = this.permissionHandlers.lastIndexOf(handler);
      if (index !== -1) this.permissionHandlers.splice(index, 1);
    };
  }

  resetSession() {
    this.resets += 1;
    this.log?.push("client.resetSession");
    this.sessionId = undefined;
    for (const listener of [...this.connectionListeners]) {
      listener(this.connectionState);
    }
  }

  listenerCounts() {
    return {
      sessionUpdate: this.sessionUpdateListeners.size,
      connection: this.connectionListeners.size,
    };
  }

  async connect() {
    this.connectCalls += 1;
    if (this.connectGate) {
      await new Promise<void>((resolve) => {
        this.connectRelease = resolve;
      });
    }
    this.connectionState = "connected";
    this.sessionId = "s1";
    this.agentInfo = { name: "fake-agent", version: "0.0.1" };
    if (this.pendingCapabilities) {
      this.agentCapabilities = this.pendingCapabilities;
      this.pendingCapabilities = undefined;
    }
    for (const listener of [...this.connectionListeners]) listener("connected");
    return {
      protocolVersion: 1,
      agentCapabilities: this.agentCapabilities ?? {},
      agentInfo: this.agentInfo,
    };
  }

  ensureSessionCalls = 0;

  async ensureSession() {
    this.ensureSessionCalls += 1;
    return this.sessionId ?? "s1";
  }

  async prompt(blocks: unknown[], signal?: AbortSignal) {
    if (signal?.aborted) {
      this.log?.push("prompt:aborted");
      return "cancelled";
    }
    this.prompts.push(blocks);
    this.log?.push("prompt:send");
    if (this.promptGate) {
      await new Promise<void>((resolve) => {
        this.release = resolve;
        this.releases.push(resolve);
      });
    }
    if (this.promptError) throw this.promptError;
    this.log?.push("prompt:settled");
    return this.stopReason;
  }

  async cancel() {
    this.cancelCalls += 1;
    this.log?.push("client.cancel");
    if (!this.cancelReleases) return;
    this.release?.();
    this.release = undefined;
  }

  emit(update: AcpSessionUpdate) {
    const sessionId = this.sessionId ?? "";
    for (const listener of [...this.sessionUpdateListeners]) {
      listener(sessionId, update);
    }
  }

  ask(request: AcpPermissionRequest) {
    const handler =
      this.configuredPermissionHandler ?? this.permissionHandlers.at(-1);
    if (!handler) throw new Error("no permission handler");
    return handler(request);
  }

  unblock() {
    this.release?.();
    this.release = undefined;
  }

  unblockConnect() {
    this.connectRelease?.();
    this.connectRelease = undefined;
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

let client: FakeClient;

beforeEach(() => {
  client = fakeClient();
});

describe("AcpThreadController", () => {
  it("subscribes on attach and unsubscribes on detach", async () => {
    const c = controller(client);
    await c.attach();
    expect(client.listenerCounts()).toEqual({
      sessionUpdate: 1,
      connection: 1,
    });
    expect(client.permissionHandlers).toHaveLength(1);
    expect(c.getState().connectionState).toBe("disconnected");

    await c.attach();
    expect(client.listenerCounts()).toEqual({
      sessionUpdate: 1,
      connection: 1,
    });

    expect(client.permissionHandlers).toHaveLength(1);
    await c.detach();
    expect(client.listenerCounts()).toEqual({
      sessionUpdate: 0,
      connection: 0,
    });
    expect(client.permissionHandlers).toHaveLength(0);
  });

  it("leaves a caller-owned client's listener and permission handler in place", async () => {
    const callerHandler: PermissionHandler = async () => ({
      outcome: "cancelled",
    });
    client.configuredPermissionHandler = callerHandler;
    const seen: AcpSessionUpdate[] = [];
    const unsubscribe = client.subscribeSessionUpdate((_id, update) =>
      seen.push(update),
    );

    const c = controller(client);
    await c.attach();
    await c.load();
    expect(client.listenerCounts()).toEqual({
      sessionUpdate: 2,
      connection: 1,
    });

    client.emit({ sessionUpdate: "session_info_update", title: "kept" });
    expect(seen).toHaveLength(1);
    expect(c.getState().sessionTitle).toBe("kept");

    await expect(client.ask(permissionRequest())).resolves.toEqual({
      outcome: "cancelled",
    });
    expect(c.getState().permissions).toEqual({});

    await c.detach();
    expect(client.permissionHandlers).toHaveLength(0);
    expect(client.listenerCounts()).toEqual({
      sessionUpdate: 1,
      connection: 0,
    });

    unsubscribe();
    expect(client.listenerCounts()).toEqual({
      sessionUpdate: 0,
      connection: 0,
    });
  });

  it("keeps a permission handler the caller registered while attached", async () => {
    const c = controller(client);
    await c.attach();

    const callerHandler: PermissionHandler = async () => ({
      outcome: "cancelled",
    });
    client.registerPermissionHandler(callerHandler);

    await c.detach();
    expect(client.permissionHandlers).toEqual([callerHandler]);
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

  it("feeds the session modes and config options the client reports", async () => {
    client.modes = {
      currentModeId: "code",
      availableModes: [{ id: "code", name: "Code" }],
    };
    client.configOptions = [
      { id: "auto", name: "Auto", type: "boolean", currentValue: true },
    ];
    const c = controller(client);
    await c.attach();
    await c.load();

    expect(c.getState().currentModeId).toBe("code");
    expect(c.getState().configOptions).toEqual([
      { id: "auto", name: "Auto", type: "boolean", currentValue: true },
    ]);
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
    await flush();
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

  it("notifies subscribers until they unsubscribe", async () => {
    const listener = vi.fn();
    const c = controller(client);
    const unsubscribe = c.subscribe(listener);
    await c.attach();
    await c.load();
    expect(listener).toHaveBeenCalled();

    listener.mockClear();
    unsubscribe();
    client.emit({ sessionUpdate: "session_info_update", title: "unseen" });
    expect(listener).not.toHaveBeenCalled();

    await c.detach();
    expect(client.listenerCounts()).toEqual({
      sessionUpdate: 0,
      connection: 0,
    });
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

  it("cancels the remote turn when detaching mid-run", async () => {
    const c = controller(client);
    await c.attach();
    await c.load();

    client.promptGate = () => {};
    const done = c.append(userAppend("x"));
    await flush();
    client.emit({
      sessionUpdate: "agent_message_chunk",
      content: { type: "text", text: "partial" },
    });
    expect(client.cancelCalls).toBe(0);

    await c.detach();

    expect(client.cancelCalls).toBe(1);
    expect(assistantOf(c).status).toEqual({
      type: "incomplete",
      reason: "cancelled",
    });

    client.unblock();
    await done;
  });

  it("cancels a turn whose session is still being created", async () => {
    const c = controller(client);
    await c.attach();
    await c.load();

    // session/new (or a session/load replay) is what makes this window long
    client.connectGate = true;
    const done = c.append(userAppend("hello"));
    await flush();
    expect(c.getState().run.type).toBe("running");

    await c.cancel();
    expect(client.cancelCalls).toBe(1);

    client.unblockConnect();
    await done;
    await flush();

    expect(client.prompts).toHaveLength(0);
    expect(assistantOf(c).status).toEqual({
      type: "incomplete",
      reason: "cancelled",
    });
    expect(c.getState().run).toEqual({ type: "idle" });
  });

  it("does not send a prompt when a detach lands while the session is created", async () => {
    const c = controller(client);
    await c.attach();
    await c.load();

    client.connectGate = true;
    const done = c.append(userAppend("hello"));
    await flush();
    expect(c.getState().run.type).toBe("running");

    await c.detach();
    client.unblockConnect();
    await done;
    await flush();

    expect(client.prompts).toHaveLength(0);
    expect(c.getState().run).toEqual({ type: "idle" });
  });

  it("does not launch a turn that a detach superseded", async () => {
    const c = controller(client);
    await c.attach();
    await c.load();

    client.promptGate = () => {};
    client.cancelReleases = false;
    const first = c.append(userAppend("1"));
    await flush();
    const queued = c.append(userAppend("2"));
    await flush();
    expect(client.prompts).toHaveLength(1);

    await c.detach();
    client.unblock();
    await first;
    await queued;

    expect(client.prompts).toHaveLength(1);
    expect(c.getState().run).toEqual({ type: "idle" });
  });

  it("shares the superseded-prompt wait between concurrent replacements", async () => {
    const c = controller(client);
    await c.attach();
    await c.load();

    const order: string[] = [];
    client.log = order;
    client.promptGate = () => {};
    // the agent keeps the turn open after session/cancel, as a real one does
    client.cancelReleases = false;
    const first = c.append(userAppend("1"));
    await flush();
    expect(order).toEqual(["prompt:send"]);

    const replacements = [c.append(userAppend("2")), c.append(userAppend("3"))];
    await flush();
    const sent = () => order.filter((entry) => entry === "prompt:send").length;
    expect(sent()).toBe(1);

    client.promptGate = undefined;
    client.unblock();
    await Promise.all([first, ...replacements]);

    const sends = order.flatMap((entry, index) =>
      entry === "prompt:send" ? [index] : [],
    );
    const settled = order.indexOf("prompt:settled");
    expect(sends).toHaveLength(3);
    expect(settled).toBeGreaterThan(-1);
    for (const send of sends.slice(1)) {
      expect(send).toBeGreaterThan(settled);
    }
  });

  it("gives concurrent replacements distinct run tokens", async () => {
    const c = controller(client);
    await c.attach();
    await c.load();

    client.promptGate = () => {};
    const first = c.append(userAppend("1"));
    await flush();
    expect(client.prompts).toHaveLength(1);

    const replacements = [c.append(userAppend("2")), c.append(userAppend("3"))];
    await flush();
    await flush();
    expect(client.prompts).toHaveLength(3);
    expect(c.getState().run.type).toBe("running");
    const pending = assistantOf(c).id;

    client.releases[1]!();
    await flush();
    await flush();

    expect(c.getState().run.type).toBe("running");
    expect(assistantOf(c).id).toBe(pending);

    client.releases[2]!();
    await Promise.all([first, ...replacements]);
    expect(c.getState().run.type).not.toBe("running");
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

  it("waits for a superseded prompt past any deadline", async () => {
    vi.useFakeTimers();
    try {
      const c = controller(client);
      await c.attach();
      await c.load();

      client.promptGate = () => {};
      client.cancelReleases = false;
      const first = c.append(userAppend("1"));
      await vi.advanceTimersByTimeAsync(0);
      expect(client.prompts).toHaveLength(1);

      const second = c.append(userAppend("2"));
      await vi.advanceTimersByTimeAsync(60_000);
      expect(client.prompts).toHaveLength(1);

      client.promptGate = undefined;
      client.unblock();
      await vi.advanceTimersByTimeAsync(0);
      await Promise.all([first, second]);

      expect(client.prompts).toHaveLength(2);
      expect(assistantOf(c).status).toEqual({
        type: "complete",
        reason: "stop",
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("ends a turn whose content the agent cannot receive at all", async () => {
    const errors: Error[] = [];
    const c = controller(client, { onError: (error) => errors.push(error) });
    await c.attach();
    await c.load();

    await c.append(
      userAppend("", {
        content: [],
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

    expect(client.prompts).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.message).toContain("image");
    expect(assistantOf(c).status).toEqual({
      type: "incomplete",
      reason: "error",
      error: errors[0]!.message,
    });
    expect(c.getState().run.type).toBe("idle");
  });

  it("ends a turn that has nothing to send at all", async () => {
    const errors: Error[] = [];
    const c = controller(client, { onError: (error) => errors.push(error) });
    await c.attach();
    await c.load();

    await c.append(userAppend("", { content: [] }));

    expect(client.prompts).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.message).toBe(
      "The message has no content the agent can receive.",
    );
    expect(assistantOf(c).status).toEqual({
      type: "incomplete",
      reason: "error",
      error: errors[0]!.message,
    });
  });

  it("sends composer attachments to the agent and keeps them in the transcript", async () => {
    client.agentCapabilities = { promptCapabilities: { image: true } };
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

  it("withholds attachments the agent's promptCapabilities do not cover", async () => {
    const errors: Error[] = [];
    const c = controller(client, { onError: (error) => errors.push(error) });
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

    expect(client.prompts).toEqual([[{ type: "text", text: "look" }]]);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.message).toContain("image");

    const state = c.getState();
    const [userId] = state.messageOrder;
    const user = state.messagesById[userId!]!;
    expect(user.role === "user" ? user.attachments : []).toHaveLength(1);
  });

  it("keeps first-turn attachments the handshake advertises support for", async () => {
    const c = controller(client, { autoConnect: false });
    await c.attach();
    await c.load();
    expect(client.connectCalls).toBe(0);
    client.pendingCapabilities = { promptCapabilities: { image: true } };

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
  });

  it("keeps what survives of an embedded resource the agent cannot accept", () => {
    const blocks = [
      { type: "text", text: "hi" },
      {
        type: "resource",
        resource: {
          uri: "file:///a.txt",
          text: "body",
          mimeType: "text/plain",
        },
      },
      {
        type: "resource",
        resource: {
          uri: "https://files.test/a.pdf",
          blob: "QUJD",
          mimeType: "application/pdf",
        },
      },
      {
        type: "resource",
        resource: {
          uri: "file:///local.pdf",
          blob: "QUJD",
          mimeType: "application/pdf",
        },
      },
      { type: "image", data: "QUJD", mimeType: "image/png" },
      { type: "audio", data: "QUJD", mimeType: "audio/mp3" },
    ] as Parameters<typeof filterPromptBlocks>[0];

    expect(filterPromptBlocks(blocks, undefined)).toEqual({
      blocks: [
        { type: "text", text: "hi" },
        { type: "text", text: "body" },
        {
          type: "resource_link",
          uri: "https://files.test/a.pdf",
          name: "https://files.test/a.pdf",
          mimeType: "application/pdf",
        },
      ],
      dropped: [blocks[3], blocks[4], blocks[5]],
    });

    expect(
      filterPromptBlocks(blocks, {
        image: true,
        audio: true,
        embeddedContext: true,
      }),
    ).toEqual({ blocks, dropped: [] });
  });

  it("reads a resource URI scheme case-insensitively", () => {
    const blocks = [
      {
        type: "resource",
        resource: {
          uri: "FILE:///local.pdf",
          blob: "QUJD",
          mimeType: "application/pdf",
        },
      },
      {
        type: "resource",
        resource: {
          uri: "HTTPS://files.test/a.pdf",
          blob: "QUJD",
          mimeType: "application/pdf",
        },
      },
    ] as Parameters<typeof filterPromptBlocks>[0];

    expect(filterPromptBlocks(blocks, undefined)).toEqual({
      blocks: [
        {
          type: "resource_link",
          uri: "HTTPS://files.test/a.pdf",
          name: "HTTPS://files.test/a.pdf",
          mimeType: "application/pdf",
        },
      ],
      dropped: [blocks[0]],
    });
  });

  it("starts a new thread by stopping the turn and resetting the session", async () => {
    const c = controller(client);
    await c.attach();
    await c.load();

    client.promptGate = () => {};
    const first = c.append(userAppend("1"));
    await flush();
    expect(c.getState().run.type).toBe("running");

    await c.startNewThread();
    await first;
    expect(client.cancelCalls).toBe(1);
    expect(client.resets).toBe(1);
    expect(c.getState().messageOrder).toEqual([]);
    expect(c.getState().run).toEqual({ type: "idle" });

    client.promptGate = undefined;
    await c.append(userAppend("2"));
    expect(client.prompts).toHaveLength(2);
    expect(assistantOf(c).status).toEqual({ type: "complete", reason: "stop" });
  });

  it("stops waiting for the old session's turn when a new thread starts", async () => {
    const c = controller(client);
    await c.attach();
    await c.load();

    client.promptGate = () => {};
    client.cancelReleases = false;
    void c.append(userAppend("1"));
    await flush();
    const waiting = c.append(userAppend("2"));
    await flush();
    expect(client.prompts).toHaveLength(1);

    await c.startNewThread();
    await waiting;
    client.promptGate = undefined;
    await c.append(userAppend("3"));

    expect(client.prompts).toHaveLength(2);
    expect(client.prompts[1]).toEqual([{ type: "text", text: "3" }]);
  });

  it("withholds a waiting replacement turn the user stopped", async () => {
    const c = controller(client);
    await c.attach();
    await c.load();

    client.promptGate = () => {};
    client.cancelReleases = false;
    const first = c.append(userAppend("1"));
    await flush();
    const second = c.append(userAppend("2"));
    await flush();
    expect(c.getState().run.type).toBe("running");

    await c.cancel();
    client.promptGate = undefined;
    client.unblock();
    await Promise.all([first, second]);

    expect(client.prompts).toHaveLength(1);
    expect(assistantOf(c).status).toEqual({
      type: "incomplete",
      reason: "cancelled",
    });
  });

  it("sends nothing for an append that a detach in the same task followed", async () => {
    const c = controller(client);
    await c.attach();
    await c.load();

    const appended = c.append(userAppend("1"));
    void c.detach();
    await appended;
    await flush();

    expect(client.prompts).toHaveLength(0);
  });

  it("sends nothing when a subscriber stops the turn as it starts", async () => {
    const c = controller(client);
    await c.attach();
    await c.load();

    let stopped = false;
    c.subscribe(() => {
      if (stopped || c.getState().run.type !== "running") return;
      stopped = true;
      void c.cancel();
    });
    await c.append(userAppend("1"));
    await flush();

    expect(stopped).toBe(true);
    expect(client.prompts).toHaveLength(0);
    expect(assistantOf(c).status).toEqual({
      type: "incomplete",
      reason: "cancelled",
    });
  });

  it("delivers an approval a subscriber answers synchronously", async () => {
    const c = controller(client);
    await c.attach();
    await c.load();

    client.promptGate = () => {};
    const turn = c.append(userAppend("1"));
    await flush();
    c.subscribe(() => {
      const [approvalId] = Object.keys(c.getState().permissions);
      if (approvalId) void c.respondToApproval({ approvalId, approved: true });
    });

    await expect(client.ask(permissionRequest())).resolves.toEqual({
      outcome: "selected",
      optionId: "allow",
    });
    client.unblock();
    await turn;
  });

  it("does not report the failure of a turn the user already stopped", async () => {
    const onError = vi.fn();
    const c = controller(client, { onError });
    await c.attach();
    await c.load();

    client.promptGate = () => {};
    client.promptError = new Error("socket closed");
    const turn = c.append(userAppend("1"));
    await flush();
    await c.cancel();
    await turn;

    expect(onError).not.toHaveBeenCalled();
  });

  it("applies tool call updates a stopped turn reports before it settles", async () => {
    const c = controller(client);
    await c.attach();
    await c.load();

    client.promptGate = () => {};
    client.cancelReleases = false;
    const turn = c.append(userAppend("1"));
    await flush();
    client.emit({
      sessionUpdate: "tool_call",
      toolCallId: "t1",
      title: "Edit",
      status: "in_progress",
    });

    await c.cancel();
    client.emit({
      sessionUpdate: "agent_message_chunk",
      content: { type: "text", text: "late" },
    });
    client.emit({
      sessionUpdate: "tool_call_update",
      toolCallId: "t1",
      status: "completed",
      rawOutput: "edited",
    });
    expect(toolStatus(c)).toMatchObject({ result: "edited" });
    expect(assistantOf(c).content.some((part) => part.type === "text")).toBe(
      false,
    );

    client.unblock();
    await turn;
    expect(c.getState().settlingAssistantId).toBeUndefined();
    client.emit({
      sessionUpdate: "tool_call_update",
      toolCallId: "t1",
      rawOutput: "ignored",
    });
    expect(toolStatus(c)).toMatchObject({ result: "edited" });
  });

  it("sends nothing for an append that a new thread followed in the same task", async () => {
    const c = controller(client);
    await c.attach();
    await c.load();

    const appended = c.append(userAppend("old thread"));
    const reset = c.startNewThread();
    await Promise.all([appended, reset]);
    await flush();

    expect(client.prompts).toHaveLength(0);
    expect(c.getState().messageOrder).toEqual([]);
  });

  it("withholds every start queued behind a turn the user stopped", async () => {
    const c = controller(client);
    await c.attach();
    await c.load();

    client.promptGate = () => {};
    client.cancelReleases = false;
    const first = c.append(userAppend("1"));
    await flush();
    const second = c.append(userAppend("2"));
    const third = c.append(userAppend("3"));
    await flush();

    await c.cancel();
    client.promptGate = undefined;
    client.unblock();
    await Promise.all([first, second, third]);
    await flush();

    expect(client.prompts).toHaveLength(1);
  });

  it("cancels a permission request that a stopped turn sends while it settles", async () => {
    const c = controller(client);
    await c.attach();
    await c.load();

    client.promptGate = () => {};
    client.cancelReleases = false;
    const first = c.append(userAppend("1"));
    await flush();
    const second = c.append(userAppend("2"));
    await flush();
    expect(c.getState().settlingAssistantId).toBeDefined();

    await expect(client.ask(permissionRequest())).resolves.toEqual({
      outcome: "cancelled",
    });
    expect(c.getState().permissions).toEqual({});

    client.promptGate = undefined;
    client.unblock();
    await Promise.all([first, second]);
  });

  it("sends a message superseded during the handshake before the one that superseded it", async () => {
    const c = controller(client, { autoConnect: false });
    await c.attach();
    await c.load();

    client.connectGate = true;
    const order: string[] = [];
    client.log = order;
    const first = c.append(userAppend("1"));
    await flush();
    const second = c.append(userAppend("2"));
    await flush();
    expect(client.prompts).toHaveLength(0);

    client.connectGate = false;
    client.unblockConnect();
    await Promise.all([first, second]);

    expect(client.prompts).toEqual([
      [{ type: "text", text: "1" }],
      [{ type: "text", text: "2" }],
    ]);
    expect(order.indexOf("client.cancel")).toBeGreaterThan(
      order.indexOf("prompt:send"),
    );
  });

  it("starts nothing for an append on a detached controller", async () => {
    const c = controller(client);
    await c.attach();
    await c.load();
    await c.detach();

    await c.append(userAppend("after unmount"));
    await flush();

    expect(client.prompts).toHaveLength(0);
    expect(c.getState().run).toEqual({ type: "idle" });
  });

  it("releases a start waiting on a turn that never settles once stopped", async () => {
    const c = controller(client);
    await c.attach();
    await c.load();

    client.promptGate = () => {};
    client.cancelReleases = false;
    void c.append(userAppend("1"));
    await flush();
    const waiting = c.append(userAppend("2"));
    await flush();

    await c.cancel();
    await waiting;

    expect(client.prompts).toHaveLength(1);
    expect(c.getState().run).toEqual({ type: "idle" });
  });

  it("resolves an approval on the turn that asked for it", async () => {
    const c = controller(client);
    await c.attach();
    await c.load();

    client.emit({
      sessionUpdate: "agent_message_chunk",
      content: { type: "text", text: "ignored while idle" },
    });
    await c.append(userAppend("1"));
    client.promptGate = () => {};
    const second = c.append(userAppend("2"));
    await flush();
    const firstAssistant =
      c.getState().messagesById[c.getState().messageOrder[1]!];

    const asked = client.ask(permissionRequest());
    const [approvalId] = Object.keys(c.getState().permissions);
    await c.respondToApproval({ approvalId: approvalId!, approved: true });
    await expect(asked).resolves.toEqual({
      outcome: "selected",
      optionId: "allow",
    });
    client.unblock();
    await second;

    expect(c.getState().messagesById[c.getState().messageOrder[1]!]).toBe(
      firstAssistant,
    );
    expect(toolStatus(c)?.approval).toMatchObject({
      approved: true,
      optionId: "allow",
    });
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
      cwd: "/workspace",
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

  it("sends no prompt when a cancel lands while session/new is unanswered", async () => {
    StubSocket.instances = [];
    const client = new AcpClient({
      url: "ws://agent.test/",
      cwd: "/workspace",
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

    const done = c.append(userAppend("hello"));
    const newSession = await waitFor(() => ws.find("session/new"));
    expect(c.getState().run.type).toBe("running");

    await c.cancel();
    ws.reply(newSession.id, { sessionId: "s1" });
    await done;
    await flush();

    expect(ws.find("session/prompt")).toBeUndefined();
    expect(ws.find("session/cancel")).toBeUndefined();
    expect(assistantOf(c).status).toEqual({
      type: "incomplete",
      reason: "cancelled",
    });
    expect(c.getState().run).toEqual({ type: "idle" });
  });
});
