import { beforeEach, describe, expect, it } from "vitest";
import { AcpClient, AcpError } from "./AcpClient";
import type { AcpSessionUpdate } from "./types";

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

async function connectClient(client: AcpClient): Promise<void> {
  const pending = client.connect();
  const ws = await until(() =>
    MockWebSocket.instances.at(-1)?.onopen ? lastWs() : undefined,
  );
  ws.open();
  const init = await until(() =>
    ws.sent.find((f) => f.method === "initialize"),
  );
  ws.receive({
    jsonrpc: "2.0",
    id: init.id!,
    result: {
      protocolVersion: 1,
      agentCapabilities: { loadSession: true },
      agentInfo: { name: "menu-agent", version: "0.1.0" },
    },
  });
  await pending;
}

beforeEach(() => {
  MockWebSocket.instances = [];
});

describe("AcpClient", () => {
  it("runs the initialize handshake over the WebSocket", async () => {
    const client = new AcpClient({
      url: "ws://agent.test/",
      webSocketFactory: (url) => new MockWebSocket(url),
    });

    const pending = client.connect();
    expect(client.connectionState).toBe("connecting");

    const ws = lastWs();
    expect(ws.url).toBe("ws://agent.test/");
    ws.open();

    const init = await until(() =>
      ws.sent.find((f) => f.method === "initialize"),
    );
    expect(init.params).toMatchObject({
      protocolVersion: 1,
      clientCapabilities: {},
      clientInfo: { name: "react-acp" },
    });

    ws.receive({
      jsonrpc: "2.0",
      id: init.id!,
      result: { protocolVersion: 1, agentInfo: { name: "crow", version: "1" } },
    });

    const result = await pending;
    expect(result.agentInfo?.name).toBe("crow");
    expect(client.connectionState).toBe("connected");
    expect(client.agentInfo?.name).toBe("crow");
    expect(ws.sent.some((f) => f.method === "notifications/initialized")).toBe(
      false,
    );
  });

  it("rejects connect when the socket errors before handshake", async () => {
    const client = new AcpClient({
      url: "ws://agent.test/",
      webSocketFactory: (url) => new MockWebSocket(url),
    });
    const pending = client.connect();
    lastWs().onerror?.({});
    await expect(pending).rejects.toThrow(
      "connection to ws://agent.test/ failed",
    );
    expect(client.connectionState).toBe("disconnected");
  });

  it("creates one session and reuses it", async () => {
    const client = new AcpClient({
      url: "ws://agent.test/",
      cwd: "/home/thomas/src/crow-team/menu",
      webSocketFactory: (url) => new MockWebSocket(url),
    });

    const first = client.ensureSession();
    const second = client.ensureSession();

    await connectClient(client);
    const ws = lastWs();
    const newSession = await until(() =>
      ws.sent.find((f) => f.method === "session/new"),
    );
    expect(newSession.params).toEqual({
      cwd: "/home/thomas/src/crow-team/menu",
      mcpServers: [],
    });
    ws.receive({
      jsonrpc: "2.0",
      id: newSession.id!,
      result: { sessionId: "session-1" },
    });

    expect(await first).toBe("session-1");
    expect(await second).toBe("session-1");
    expect(ws.sent.filter((f) => f.method === "session/new")).toHaveLength(1);
  });

  it("sends prompts and dispatches session/update notifications", async () => {
    const client = new AcpClient({
      url: "ws://agent.test/",
      webSocketFactory: (url) => new MockWebSocket(url),
    });
    const promptPromise = client.prompt([{ type: "text", text: "hi" }]);
    await connectClient(client);
    const ws = lastWs();

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
    expect(prompt.params).toEqual({
      sessionId: "s1",
      prompt: [{ type: "text", text: "hi" }],
    });

    const updates: Array<{ sessionId: string; update: AcpSessionUpdate }> = [];
    client.onSessionUpdate = (sessionId, update) =>
      updates.push({ sessionId, update });
    ws.receive({
      jsonrpc: "2.0",
      method: "session/update",
      params: {
        sessionId: "s1",
        update: {
          sessionUpdate: "agent_message_chunk",
          content: { type: "text", text: "Hello!" },
        },
      },
    });
    expect(updates).toHaveLength(1);
    expect(updates[0]!.sessionId).toBe("s1");

    ws.receive({
      jsonrpc: "2.0",
      id: prompt.id!,
      result: { stopReason: "end_turn" },
    });
    expect(await promptPromise).toBe("end_turn");
  });

  it("surfaces JSON-RPC errors as AcpError", async () => {
    const client = new AcpClient({
      url: "ws://agent.test/",
      webSocketFactory: (url) => new MockWebSocket(url),
    });
    const promptPromise = client.prompt([{ type: "text", text: "hi" }]);
    await connectClient(client);
    const ws = lastWs();
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
    ws.receive({
      jsonrpc: "2.0",
      id: prompt.id!,
      error: { code: -32000, message: "model exploded" },
    });
    await expect(promptPromise).rejects.toBeInstanceOf(AcpError);
    await expect(promptPromise).rejects.toThrow("model exploded");
  });

  it("answers permission requests with the auto-allow policy by default", async () => {
    const client = new AcpClient({
      url: "ws://agent.test/",
      webSocketFactory: (url) => new MockWebSocket(url),
    });
    await connectClient(client);
    const ws = lastWs();

    ws.receive({
      jsonrpc: "2.0",
      id: 77,
      method: "session/request_permission",
      params: {
        sessionId: "s1",
        toolCall: { toolCallId: "t1", title: "write_file" },
        options: [
          { optionId: "reject-1", name: "Reject", kind: "reject_once" },
          { optionId: "allow-1", name: "Allow", kind: "allow_once" },
        ],
      },
    });

    const response = await until(() => ws.sent.find((f) => f.id === 77));
    expect(response.result).toEqual({
      outcome: { outcome: "selected", optionId: "allow-1" },
    });
  });

  it("routes permission requests through a custom handler", async () => {
    const client = new AcpClient({
      url: "ws://agent.test/",
      webSocketFactory: (url) => new MockWebSocket(url),
    });
    client.permissionHandler = () => ({ outcome: "cancelled" });
    await connectClient(client);
    const ws = lastWs();

    ws.receive({
      jsonrpc: "2.0",
      id: 78,
      method: "session/request_permission",
      params: {
        sessionId: "s1",
        toolCall: { toolCallId: "t1" },
        options: [{ optionId: "allow-1", name: "Allow", kind: "allow_once" }],
      },
    });

    const response = await until(() => ws.sent.find((f) => f.id === 78));
    expect(response.result).toEqual({ outcome: { outcome: "cancelled" } });
  });

  it("rejects unsupported server requests", async () => {
    const client = new AcpClient({
      url: "ws://agent.test/",
      webSocketFactory: (url) => new MockWebSocket(url),
    });
    await connectClient(client);
    const ws = lastWs();

    ws.receive({
      jsonrpc: "2.0",
      id: 79,
      method: "terminal/create",
      params: {},
    });

    const response = await until(() => ws.sent.find((f) => f.id === 79));
    expect(response.error?.code).toBe(-32601);
  });

  it("sends session/cancel and clears the session on close", async () => {
    const client = new AcpClient({
      url: "ws://agent.test/",
      webSocketFactory: (url) => new MockWebSocket(url),
    });
    const sessionPromise = client.ensureSession();
    await connectClient(client);
    const ws = lastWs();
    const newSession = await until(() =>
      ws.sent.find((f) => f.method === "session/new"),
    );
    ws.receive({
      jsonrpc: "2.0",
      id: newSession.id!,
      result: { sessionId: "s1" },
    });
    await sessionPromise;

    void client.cancel();
    const cancel = await until(() =>
      ws.sent.find((f) => f.method === "session/cancel"),
    );
    expect(cancel.params).toEqual({ sessionId: "s1" });
    expect(cancel.id).toBeUndefined(); // notification — no response expected

    const states: string[] = [];
    client.onConnectionChange = (state) => states.push(state);
    ws.onclose?.({});
    expect(client.connectionState).toBe("disconnected");
    expect(client.sessionId).toBeUndefined();
    expect(states).toEqual(["disconnected"]);
  });

  it("rejects in-flight requests when the connection closes", async () => {
    const client = new AcpClient({
      url: "ws://agent.test/",
      webSocketFactory: (url) => new MockWebSocket(url),
    });
    const promptPromise = client.prompt([{ type: "text", text: "hi" }]);
    await connectClient(client);
    const ws = lastWs();
    const newSession = await until(() =>
      ws.sent.find((f) => f.method === "session/new"),
    );
    ws.receive({
      jsonrpc: "2.0",
      id: newSession.id!,
      result: { sessionId: "s1" },
    });
    await until(() => ws.sent.find((f) => f.method === "session/prompt"));

    ws.onclose?.({});
    await expect(promptPromise).rejects.toThrow("connection closed");
  });
});
