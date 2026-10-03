import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AcpClient,
  AcpError,
  autoAllowPermissionHandler,
  cancelPermissionHandler,
} from "./AcpClient";
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

  readonly url: string;
  onopen: ((event?: unknown) => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onclose: ((event?: { code?: number; reason?: string }) => void) | null = null;
  onerror: ((event?: unknown) => void) | null = null;

  sent: JsonRpcFrame[] = [];
  closed = false;

  constructor(url: string) {
    this.url = url;
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

const mockClient = (
  options?: Partial<ConstructorParameters<typeof AcpClient>[0]>,
) =>
  new AcpClient({
    url: "ws://agent.test/",
    webSocketFactory: (url) => new MockWebSocket(url),
    ...options,
  });

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

async function withSession(client: AcpClient): Promise<MockWebSocket> {
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
  return ws;
}

const permissionRequest = (id: number): JsonRpcFrame => ({
  jsonrpc: "2.0",
  id,
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

beforeEach(() => {
  MockWebSocket.instances = [];
});

describe("AcpClient", () => {
  it("runs the initialize handshake over the WebSocket", async () => {
    const client = mockClient();
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
    const client = mockClient();
    const pending = client.connect();
    lastWs().onerror?.({});
    await expect(pending).rejects.toThrow(
      "connection to ws://agent.test/ failed",
    );
    expect(client.connectionState).toBe("disconnected");
  });

  it("creates one session and reuses it", async () => {
    const client = mockClient({ cwd: "/srv/app" });
    const first = client.ensureSession();
    const second = client.ensureSession();
    const ws = await withSession(client);

    expect(await first).toBe("s1");
    expect(await second).toBe("s1");
    expect(ws.sent.filter((f) => f.method === "session/new")).toHaveLength(1);
    expect(ws.sent.find((f) => f.method === "session/new")?.params).toEqual({
      cwd: "/srv/app",
      mcpServers: [],
    });
  });

  it("sends prompts and dispatches session/update notifications", async () => {
    const client = mockClient();
    const promptPromise = client.prompt([{ type: "text", text: "hi" }]);
    const ws = await withSession(client);

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
    const client = mockClient();
    const promptPromise = client.prompt([{ type: "text", text: "hi" }]);
    const ws = await withSession(client);
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

  it("refuses permission requests unless the caller opts in", async () => {
    const client = mockClient();
    expect(client.permissionHandler).toBe(cancelPermissionHandler);
    await connectClient(client);
    const ws = lastWs();

    ws.receive(permissionRequest(77));

    const response = await until(() => ws.sent.find((f) => f.id === 77));
    expect(response.result).toEqual({ outcome: { outcome: "cancelled" } });
  });

  it("routes permission requests through the configured handler", async () => {
    const client = mockClient({
      permissionHandler: autoAllowPermissionHandler,
    });
    await connectClient(client);
    const ws = lastWs();

    ws.receive(permissionRequest(78));

    const response = await until(() => ws.sent.find((f) => f.id === 78));
    expect(response.result).toEqual({
      outcome: { outcome: "selected", optionId: "allow-1" },
    });
  });

  it("replies cancelled when the permission handler throws synchronously", async () => {
    const client = mockClient({
      permissionHandler: () => {
        throw new Error("handler exploded");
      },
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await connectClient(client);
    const ws = lastWs();

    ws.receive(permissionRequest(79));

    const response = await until(() => ws.sent.find((f) => f.id === 79));
    expect(response.result).toEqual({ outcome: { outcome: "cancelled" } });
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("replies cancelled to outstanding permission requests on cancel", async () => {
    const client = mockClient({
      permissionHandler: () => new Promise(() => {}),
    });
    const ws = await withSession(client);
    ws.receive(permissionRequest(80));
    await new Promise((r) => setTimeout(r, 0));

    await client.cancel();

    const response = await until(() => ws.sent.find((f) => f.id === 80));
    expect(response.result).toEqual({ outcome: { outcome: "cancelled" } });
    expect(ws.sent.find((f) => f.method === "session/cancel")?.params).toEqual({
      sessionId: "s1",
    });
  });

  it("rejects unsupported server requests", async () => {
    const client = mockClient();
    await connectClient(client);
    const ws = lastWs();

    ws.receive({
      jsonrpc: "2.0",
      id: 81,
      method: "terminal/create",
      params: {},
    });

    const response = await until(() => ws.sent.find((f) => f.id === 81));
    expect(response.error?.code).toBe(-32601);
  });

  it("sends session/cancel as a notification and clears the session on close", async () => {
    const client = mockClient();
    const ws = await withSession(client);

    await client.cancel();
    const cancel = await until(() =>
      ws.sent.find((f) => f.method === "session/cancel"),
    );
    expect(cancel.params).toEqual({ sessionId: "s1" });
    expect(cancel.id).toBeUndefined();

    const states: string[] = [];
    client.onConnectionChange = (state) => states.push(state);
    ws.onclose?.({});
    expect(client.connectionState).toBe("disconnected");
    expect(client.sessionId).toBeUndefined();
    expect(states).toEqual(["disconnected"]);
  });

  it("rejects in-flight requests when the connection closes", async () => {
    const client = mockClient();
    const promptPromise = client.prompt([{ type: "text", text: "hi" }]);
    const ws = await withSession(client);
    await until(() => ws.sent.find((f) => f.method === "session/prompt"));

    ws.onclose?.({});
    await expect(promptPromise).rejects.toThrow("connection closed");
  });

  it("ignores a superseded socket", async () => {
    const client = mockClient();
    const first = client.connect();
    const stale = lastWs();
    stale.onerror?.({});
    await expect(first).rejects.toThrow();

    const second = client.connect();
    const current = lastWs();
    current.open();
    const init = await until(() =>
      current.sent.find((f) => f.method === "initialize"),
    );
    current.receive({
      jsonrpc: "2.0",
      id: init.id!,
      result: { protocolVersion: 1 },
    });
    await expect(second).resolves.toBeDefined();

    stale.onclose?.({});
    expect(client.connectionState).toBe("connected");
  });

  it("clears the session and handshake result on dispose", async () => {
    const client = mockClient();
    const ws = await withSession(client);
    expect(client.sessionId).toBe("s1");

    client.dispose();

    expect(ws.closed).toBe(true);
    expect(ws.onmessage).toBeNull();
    expect(ws.onclose).toBeNull();
    expect(client.sessionId).toBeUndefined();
    expect(client.agentInfo).toBeUndefined();
    expect(client.connectionState).toBe("disconnected");
    await expect(client.connect()).rejects.toThrow("disposed");
  });

  it("answers outstanding permission requests before closing on dispose", async () => {
    const client = mockClient({
      permissionHandler: () => new Promise(() => {}),
    });
    const ws = await withSession(client);
    ws.receive(permissionRequest(90));
    await new Promise((r) => setTimeout(r, 0));

    client.dispose();

    expect(ws.sent.find((f) => f.id === 90)?.result).toEqual({
      outcome: { outcome: "cancelled" },
    });
    expect(ws.closed).toBe(true);
  });

  it("keeps connect resolving when onConnectionChange throws", async () => {
    const client = mockClient();
    client.onConnectionChange = () => {
      throw new Error("listener exploded");
    };
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(connectClient(client)).resolves.toBeUndefined();
    expect(client.connectionState).toBe("connected");
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("times out a lifecycle request the agent never answers", async () => {
    const client = mockClient({ requestTimeoutMs: 20 });
    const pending = client.connect();
    lastWs().open();
    await expect(pending).rejects.toThrow("initialize timed out after 20ms");
  });

  it("rejects connect when the client is disposed mid-handshake", async () => {
    const client = mockClient();
    const pending = client.connect();
    const ws = lastWs();
    ws.open();
    await until(() => ws.sent.find((f) => f.method === "initialize"));

    client.dispose();

    await expect(pending).rejects.toThrow("disposed");
    expect(client.connectionState).toBe("disconnected");
    expect(ws.closed).toBe(true);
  });

  it("does not open a socket when a listener disposes during connecting", async () => {
    const client = mockClient();
    const states: string[] = [];
    client.onConnectionChange = (state) => {
      states.push(state);
      if (state === "connecting") client.dispose();
    };

    await expect(client.connect()).rejects.toThrow("disposed");

    expect(MockWebSocket.instances).toHaveLength(0);
    expect(client.connectionState).toBe("disconnected");
    expect(states).toEqual(["connecting", "disconnected"]);
  });

  it("reports disconnected once when dispose interrupts a handshake", async () => {
    const client = mockClient();
    const pending = client.connect();
    const ws = lastWs();
    ws.open();
    await until(() => ws.sent.find((f) => f.method === "initialize"));

    const states: string[] = [];
    client.onConnectionChange = (state) => states.push(state);
    client.dispose();

    await expect(pending).rejects.toThrow("disposed");
    expect(states).toEqual(["disconnected"]);
  });

  it("reports disconnected once when the socket errors then closes", async () => {
    const client = mockClient();
    const states: string[] = [];
    client.onConnectionChange = (state) => states.push(state);
    const pending = client.connect();
    const ws = lastWs();

    ws.onerror?.({});
    ws.onclose?.({});

    await expect(pending).rejects.toThrow();
    expect(states).toEqual(["connecting", "disconnected"]);
  });

  it("notifies onConnectionChange once the session id is known", async () => {
    const client = mockClient();
    const seen: (string | undefined)[] = [];
    client.onConnectionChange = () => {
      seen.push(client.sessionId);
    };

    await withSession(client);

    expect(seen).toContain("s1");
  });

  it("sends an absolute cwd to session/new by default", async () => {
    const client = mockClient();
    const ws = await withSession(client);

    expect(ws.sent.find((f) => f.method === "session/new")?.params).toEqual({
      cwd: "/",
      mcpServers: [],
    });
  });

  it("finishes dispose cleanup when the transport throws on close", async () => {
    const client = mockClient();
    const ws = await withSession(client);
    ws.close = () => {
      throw new Error("transport exploded");
    };
    const inflight = client.prompt([{ type: "text", text: "hi" }]);
    await until(() =>
      ws.sent.some((f) => f.method === "session/prompt") ? true : undefined,
    );

    expect(() => client.dispose()).not.toThrow();

    expect(client.sessionId).toBeUndefined();
    expect(client.connectionState).toBe("disconnected");
    await expect(inflight).rejects.toThrow("disposed");
  });

  it("still cleans up when a permission reply cannot be sent on dispose", async () => {
    const client = mockClient({
      permissionHandler: () => new Promise(() => {}),
    });
    const ws = await withSession(client);
    ws.receive(permissionRequest(91));
    await new Promise((r) => setTimeout(r, 0));
    ws.send = () => {
      throw new Error("transport exploded");
    };

    expect(() => client.dispose()).not.toThrow();

    expect(client.sessionId).toBeUndefined();
    expect(client.connectionState).toBe("disconnected");
  });
});
