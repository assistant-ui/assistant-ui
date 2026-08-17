import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  AppendMessage,
  ThreadAssistantMessage,
  ToolCallMessagePart,
} from "@assistant-ui/core";
import { AcpClient } from "./AcpClient";
import { AcpThreadRuntimeCore } from "./AcpThreadRuntimeCore";

type JsonRpcFrame = {
  jsonrpc: "2.0";
  id?: number | string;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

class MockWebSocket {
  static instances: MockWebSocket[] = [];

  onopen: ((event?: unknown) => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onclose: ((event?: { code?: number; reason?: string }) => void) | null = null;
  onerror: ((event?: unknown) => void) | null = null;

  sent: JsonRpcFrame[] = [];
  closed = false;

  constructor(readonly url: string) {
    MockWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(JSON.parse(data) as JsonRpcFrame);
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.onclose?.({});
  }

  open() {
    this.onopen?.({});
  }

  receive(frame: JsonRpcFrame) {
    this.onmessage?.({ data: JSON.stringify(frame) });
  }
}

async function until<T>(fn: () => T | undefined, ms = 2000): Promise<T> {
  const start = Date.now();
  for (;;) {
    const value = fn();
    if (value !== undefined) return value;
    if (Date.now() - start > ms) throw new Error("timed out waiting");
    await new Promise((r) => setTimeout(r, 5));
  }
}

const lastWs = () => MockWebSocket.instances.at(-1)!;

function createUserAppendMessage(text: string): AppendMessage {
  return {
    parentId: null,
    role: "user",
    content: [{ type: "text", text }],
  } as unknown as AppendMessage;
}

function setup() {
  const client = new AcpClient({
    url: "ws://agent.test/",
    webSocketFactory: (url) => new MockWebSocket(url),
  });
  const notifyUpdate = vi.fn();
  const core = new AcpThreadRuntimeCore({ client, notifyUpdate });
  return { client, core, notifyUpdate };
}

/** Open the socket and drive initialize -> session/new -> session/prompt. */
async function driveHandshake() {
  const ws = lastWs();
  ws.open();
  const init = await until(() =>
    ws.sent.find((f) => f.method === "initialize"),
  );
  ws.receive({
    jsonrpc: "2.0",
    id: init.id!,
    result: {
      protocolVersion: 1,
      agentInfo: { name: "menu-agent", version: "0.1.0" },
    },
  });
  const newSession = await until(() =>
    ws.sent.find((f) => f.method === "session/new"),
  );
  ws.receive({
    jsonrpc: "2.0",
    id: newSession.id!,
    result: { sessionId: "s1" },
  });
  const prompt = await until(() =>
    ws.sent.find((f) => f.method === "session/prompt"),
  );
  return { ws, prompt };
}

const lastAssistant = (core: AcpThreadRuntimeCore) =>
  core.getMessages().at(-1) as ThreadAssistantMessage;

const sessionUpdate = (update: unknown): JsonRpcFrame => ({
  jsonrpc: "2.0",
  method: "session/update",
  params: { sessionId: "s1", update },
});

beforeEach(() => {
  MockWebSocket.instances = [];
});

describe("AcpThreadRuntimeCore", () => {
  it("streams text chunks into the assistant message and completes", async () => {
    const { core } = setup();
    const runPromise = core.append(createUserAppendMessage("plan dinner"));

    const messages = core.getMessages();
    expect(messages).toHaveLength(2);
    expect(messages[0]!.role).toBe("user");
    expect(messages[1]!.role).toBe("assistant");
    expect(messages[1]!.status).toEqual({ type: "running" });
    expect(core.isRunning()).toBe(true);

    const { ws, prompt } = await driveHandshake();
    expect(prompt.params).toEqual({
      sessionId: "s1",
      prompt: [{ type: "text", text: "plan dinner" }],
    });

    ws.receive(
      sessionUpdate({
        sessionUpdate: "agent_message_chunk",
        content: { type: "text", text: "How about " },
      }),
    );
    ws.receive(
      sessionUpdate({
        sessionUpdate: "agent_message_chunk",
        content: { type: "text", text: "chana masala?" },
      }),
    );
    expect(lastAssistant(core).content).toEqual([
      { type: "text", text: "How about chana masala?" },
    ]);

    ws.receive({
      jsonrpc: "2.0",
      id: prompt.id!,
      result: { stopReason: "end_turn" },
    });
    await runPromise;

    expect(lastAssistant(core).status).toEqual({
      type: "complete",
      reason: "stop",
    });
    expect(core.isRunning()).toBe(false);
    expect(core.getExtras().sessionId).toBe("s1");
    expect(core.getExtras().agentInfo?.name).toBe("menu-agent");
  });

  it("renders tool calls and their updates as tool-call parts", async () => {
    const { core } = setup();
    const runPromise = core.append(
      createUserAppendMessage("find queso recipes"),
    );
    const { ws, prompt } = await driveHandshake();

    ws.receive(
      sessionUpdate({
        sessionUpdate: "tool_call",
        toolCallId: "t1",
        title: "web_search",
        status: "in_progress",
        rawInput: { query: "queso recipe" },
      }),
    );
    let part = lastAssistant(core).content[0] as ToolCallMessagePart;
    expect(part.type).toBe("tool-call");
    expect(part.toolName).toBe("web_search");
    expect(part.args).toEqual({ query: "queso recipe" });
    expect(part.status).toEqual({ type: "running" });

    ws.receive(
      sessionUpdate({
        sessionUpdate: "tool_call_update",
        toolCallId: "t1",
        status: "completed",
        rawOutput: { hits: 5 },
      }),
    );
    part = lastAssistant(core).content[0] as ToolCallMessagePart;
    expect(part.result).toEqual({ hits: 5 });
    expect(part.status).toEqual({ type: "complete" });
    expect(lastAssistant(core).content).toHaveLength(1);

    ws.receive({
      jsonrpc: "2.0",
      id: prompt.id!,
      result: { stopReason: "end_turn" },
    });
    await runPromise;
  });

  it("surfaces permission requests as approvals and answers them", async () => {
    const { core } = setup();
    const runPromise = core.append(createUserAppendMessage("save the recipe"));
    const { ws, prompt } = await driveHandshake();

    ws.receive({
      jsonrpc: "2.0",
      id: 500,
      method: "session/request_permission",
      params: {
        sessionId: "s1",
        toolCall: { toolCallId: "t9", title: "write_file", status: "pending" },
        options: [
          { optionId: "allow-1", name: "Allow once", kind: "allow_once" },
          { optionId: "reject-1", name: "Reject", kind: "reject_once" },
        ],
      },
    });

    await until(() =>
      lastAssistant(core).status.type === "requires-action" ? true : undefined,
    );
    const awaiting = lastAssistant(core);
    expect(awaiting.status).toEqual({
      type: "requires-action",
      reason: "tool-calls",
    });
    const toolPart = awaiting.content.find(
      (p) => p.type === "tool-call",
    ) as ToolCallMessagePart;
    expect(toolPart.toolName).toBe("write_file");
    expect(toolPart.approval?.id).toBe("acp-permission-1");
    expect(toolPart.approval?.options).toEqual([
      { id: "allow-1", kind: "allow-once", label: "Allow once" },
      { id: "reject-1", kind: "reject-once", label: "Reject" },
    ]);

    core.respondToApproval({
      approvalId: "acp-permission-1",
      approved: true,
      optionId: "allow-1",
    });
    const response = await until(() => ws.sent.find((f) => f.id === 500));
    expect(response.result).toEqual({
      outcome: { outcome: "selected", optionId: "allow-1" },
    });
    expect(lastAssistant(core).status).toEqual({ type: "running" });
    const resolvedPart = lastAssistant(core).content.find(
      (p) => p.type === "tool-call",
    ) as ToolCallMessagePart;
    expect(resolvedPart.approval?.approved).toBe(true);

    ws.receive({
      jsonrpc: "2.0",
      id: prompt.id!,
      result: { stopReason: "end_turn" },
    });
    await runPromise;
  });

  it("picks an allow option by default when approved without optionId", async () => {
    const { core } = setup();
    const runPromise = core.append(createUserAppendMessage("save the recipe"));
    const { ws, prompt } = await driveHandshake();

    ws.receive({
      jsonrpc: "2.0",
      id: 501,
      method: "session/request_permission",
      params: {
        sessionId: "s1",
        toolCall: { toolCallId: "t9" },
        options: [
          { optionId: "reject-1", name: "Reject", kind: "reject_once" },
          { optionId: "allow-1", name: "Allow once", kind: "allow_once" },
        ],
      },
    });
    await until(() =>
      lastAssistant(core).status.type === "requires-action" ? true : undefined,
    );

    core.respondToApproval({ approvalId: "acp-permission-1", approved: true });
    const response = await until(() => ws.sent.find((f) => f.id === 501));
    expect(response.result).toEqual({
      outcome: { outcome: "selected", optionId: "allow-1" },
    });

    ws.receive({
      jsonrpc: "2.0",
      id: prompt.id!,
      result: { stopReason: "end_turn" },
    });
    await runPromise;
  });

  it("auto-allows permissions in auto-allow mode", async () => {
    const { core, client } = setup();
    core.updateOptions({ client, permissions: "auto-allow" });
    const runPromise = core.append(createUserAppendMessage("save the recipe"));
    const { ws, prompt } = await driveHandshake();

    ws.receive({
      jsonrpc: "2.0",
      id: 502,
      method: "session/request_permission",
      params: {
        sessionId: "s1",
        toolCall: { toolCallId: "t9" },
        options: [
          { optionId: "reject-1", name: "Reject", kind: "reject_once" },
          { optionId: "allow-1", name: "Allow once", kind: "allow_once" },
        ],
      },
    });

    const response = await until(() => ws.sent.find((f) => f.id === 502));
    expect(response.result).toEqual({
      outcome: { outcome: "selected", optionId: "allow-1" },
    });
    expect(lastAssistant(core).status).toEqual({ type: "running" });

    ws.receive({
      jsonrpc: "2.0",
      id: prompt.id!,
      result: { stopReason: "end_turn" },
    });
    await runPromise;
  });

  it("cancels runs locally and on the server", async () => {
    const { core, client } = setup();
    const onCancel = vi.fn();
    core.updateOptions({ client, onCancel });
    const runPromise = core.append(createUserAppendMessage("long task"));
    const { ws, prompt } = await driveHandshake();

    await core.cancel();
    expect(lastAssistant(core).status).toEqual({
      type: "incomplete",
      reason: "cancelled",
    });
    expect(onCancel).toHaveBeenCalledTimes(1);

    const cancelFrame = await until(() =>
      ws.sent.find((f) => f.method === "session/cancel"),
    );
    expect(cancelFrame.params).toEqual({ sessionId: "s1" });
    expect(cancelFrame.id).toBeUndefined();

    ws.receive({
      jsonrpc: "2.0",
      id: prompt.id!,
      result: { stopReason: "cancelled" },
    });
    await runPromise;
    expect(core.isRunning()).toBe(false);
    expect(lastAssistant(core).status).toEqual({
      type: "incomplete",
      reason: "cancelled",
    });
  });

  it("cancels pending permissions when the run is cancelled", async () => {
    const { core } = setup();
    const runPromise = core.append(createUserAppendMessage("save the recipe"));
    const { ws, prompt } = await driveHandshake();

    ws.receive({
      jsonrpc: "2.0",
      id: 503,
      method: "session/request_permission",
      params: {
        sessionId: "s1",
        toolCall: { toolCallId: "t9" },
        options: [
          { optionId: "allow-1", name: "Allow once", kind: "allow_once" },
        ],
      },
    });
    await until(() =>
      lastAssistant(core).status.type === "requires-action" ? true : undefined,
    );

    await core.cancel();
    const response = await until(() => ws.sent.find((f) => f.id === 503));
    expect(response.result).toEqual({ outcome: { outcome: "cancelled" } });

    const cancelFrame = await until(() =>
      ws.sent.find((f) => f.method === "session/cancel"),
    );
    expect(cancelFrame.id).toBeUndefined();
    ws.receive({
      jsonrpc: "2.0",
      id: prompt.id!,
      result: { stopReason: "cancelled" },
    });
    await runPromise;
  });

  it("tracks plan and session info updates in extras", async () => {
    const { core } = setup();
    const runPromise = core.append(createUserAppendMessage("plan the week"));
    const { ws, prompt } = await driveHandshake();

    const entries = [
      { content: "pick recipes", priority: "high", status: "in_progress" },
      { content: "build grocery list", priority: "medium", status: "pending" },
    ];
    ws.receive(sessionUpdate({ sessionUpdate: "plan", entries }));
    expect(core.getExtras().plan).toEqual(entries);

    ws.receive(
      sessionUpdate({ sessionUpdate: "session_info_update", title: "Week 33" }),
    );
    expect(core.getExtras().sessionTitle).toBe("Week 33");

    ws.receive({
      jsonrpc: "2.0",
      id: prompt.id!,
      result: { stopReason: "end_turn" },
    });
    await runPromise;
  });

  it("marks the assistant message as errored when the prompt fails", async () => {
    const { core, client } = setup();
    const onError = vi.fn();
    core.updateOptions({ client, onError });
    const runPromise = core.append(createUserAppendMessage("hello"));
    const { ws, prompt } = await driveHandshake();

    ws.receive({
      jsonrpc: "2.0",
      id: prompt.id!,
      error: { code: -32000, message: "LLM provider down" },
    });
    await runPromise;

    expect(lastAssistant(core).status).toMatchObject({
      type: "incomplete",
      reason: "error",
      error: "LLM provider down",
    });
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]![0].message).toBe("LLM provider down");
    expect(core.isRunning()).toBe(false);
  });
});
