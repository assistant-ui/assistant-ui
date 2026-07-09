import { createTapRoot, useResource } from "@assistant-ui/tap";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MCPAuthConfig } from "../mcp-scope";
import type { MCPStorage } from "./storage/types";

const mocks = vi.hoisted(() => {
  const clients: any[] = [];
  const transports: any[] = [];
  const connectResults: Array<() => Promise<void>> = [];
  const listToolsResults: Array<
    () => Promise<{
      tools: Array<{
        name: string;
        description?: string;
        inputSchema: unknown;
      }>;
    }>
  > = [];
  const finishAuthResults: Array<() => Promise<void>> = [];

  const Client = vi.fn().mockImplementation(function Client(this: any) {
    const index = clients.length;
    this.connect = vi.fn(() => connectResults[index]?.() ?? Promise.resolve());
    this.listTools = vi.fn(
      () => listToolsResults[index]?.() ?? Promise.resolve({ tools: [] }),
    );
    this.callTool = vi.fn();
    this.readResource = vi.fn();
    clients.push(this);
  });

  const StreamableHTTPClientTransport = vi
    .fn()
    .mockImplementation(function StreamableHTTPClientTransport(
      this: any,
      url: URL,
      options?: unknown,
    ) {
      const index = transports.length;
      this.url = url;
      this.options = options;
      this.close = vi.fn(() => Promise.resolve());
      this.finishAuth = vi.fn(
        () => finishAuthResults[index]?.() ?? Promise.resolve(),
      );
      transports.push(this);
    });

  return {
    Client,
    StreamableHTTPClientTransport,
    clients,
    transports,
    connectResults,
    listToolsResults,
    finishAuthResults,
  };
});

vi.mock("@modelcontextprotocol/sdk/client/index.js", () => ({
  Client: mocks.Client,
}));

vi.mock("@modelcontextprotocol/sdk/client/streamableHttp.js", () => ({
  StreamableHTTPClientTransport: mocks.StreamableHTTPClientTransport,
}));

const { McpServerResource } = await import("./McpServerResource");

const never = <T>() => new Promise<T>(() => {});

const tick = async () => {
  await Promise.resolve();
};

const flushMacrotask = async () => {
  await new Promise<void>((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => {
      channel.port1.close();
      channel.port2.close();
      resolve();
    };
    channel.port2.postMessage(null);
  });
};

const waitFor = async (predicate: () => boolean) => {
  for (let i = 0; i < 20; i++) {
    if (predicate()) return;
    await tick();
  }
  expect(predicate()).toBe(true);
};

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const tool = (name: string) => ({
  name,
  inputSchema: { type: "object" },
});

const createStorage = (): MCPStorage => ({
  loadCustomServers: vi.fn(async () => []),
  saveCustomServers: vi.fn(async () => {}),
  loadAuthState: vi.fn(async () => null),
  saveAuthState: vi.fn(async () => {}),
  clearAuthState: vi.fn(async () => {}),
});

const resetMocks = () => {
  mocks.clients.length = 0;
  mocks.transports.length = 0;
  mocks.connectResults.length = 0;
  mocks.listToolsResults.length = 0;
  mocks.finishAuthResults.length = 0;
  mocks.Client.mockClear();
  mocks.StreamableHTTPClientTransport.mockClear();
};

const mount = (props?: {
  auth?: MCPAuthConfig | undefined;
  connectionTimeout?: number | undefined;
}) => {
  const connectionTimeout =
    props && "connectionTimeout" in props ? props.connectionTimeout : 10_000;

  return createTapRoot(function Root() {
    return useResource(
      McpServerResource({
        id: "docs",
        kind: "connector",
        name: "Docs",
        url: "https://example.com/mcp",
        auth: props?.auth ?? { type: "none" },
        storage: createStorage(),
        redirectUri: "https://example.com/callback",
        autoConnect: false,
        connectionTimeout,
        onRemove: vi.fn(async () => {}),
      }),
    );
  });
};

describe("McpServerResource connectionTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fails the connection when client.connect hangs", async () => {
    mocks.connectResults.push(() => never());
    const root = mount();

    try {
      const connectPromise = root.getValue().connect();
      await waitFor(() => mocks.clients[0]?.connect.mock.calls.length === 1);

      await vi.advanceTimersByTimeAsync(10_000);
      await connectPromise;

      expect(root.getValue().getState()).toMatchObject({
        connectionState: "error",
        tools: [],
        lastError: {
          message:
            'MCP server "docs" timed out while connecting after 10000ms.',
        },
      });
      expect(mocks.transports[0].close).toHaveBeenCalledTimes(1);
    } finally {
      root.unmount();
    }
  });

  it("fails the connection when client.listTools hangs", async () => {
    mocks.listToolsResults.push(() => never());
    const root = mount();

    try {
      const connectPromise = root.getValue().connect();
      await waitFor(() => mocks.clients[0]?.listTools.mock.calls.length === 1);

      await vi.advanceTimersByTimeAsync(10_000);
      await connectPromise;

      expect(root.getValue().getState()).toMatchObject({
        connectionState: "error",
        tools: [],
        lastError: {
          message:
            'MCP server "docs" timed out while listing tools after 10000ms.',
        },
      });
      expect(mocks.transports[0].close).toHaveBeenCalledTimes(1);
    } finally {
      root.unmount();
    }
  });

  it("uses one timeout budget for connect and listTools", async () => {
    mocks.connectResults.push(
      () => new Promise<void>((resolve) => setTimeout(resolve, 9_000)),
    );
    mocks.listToolsResults.push(() => never());
    const root = mount();

    try {
      const connectPromise = root.getValue().connect();
      await waitFor(() => mocks.clients[0]?.connect.mock.calls.length === 1);

      await vi.advanceTimersByTimeAsync(9_000);
      await waitFor(() => mocks.clients[0]?.listTools.mock.calls.length === 1);
      await vi.advanceTimersByTimeAsync(999);
      await tick();
      expect(root.getValue().getState().connectionState).toBe("connecting");

      await vi.advanceTimersByTimeAsync(1);
      await connectPromise;

      expect(root.getValue().getState()).toMatchObject({
        connectionState: "error",
        tools: [],
        lastError: {
          message:
            'MCP server "docs" timed out while listing tools after 10000ms.',
        },
      });
      expect(mocks.transports[0].close).toHaveBeenCalledTimes(1);
    } finally {
      root.unmount();
    }
  });

  it("keeps waiting when connectionTimeout is undefined", async () => {
    mocks.connectResults.push(() => never());
    const root = mount({ connectionTimeout: undefined });

    try {
      void root.getValue().connect();
      await waitFor(() => mocks.clients[0]?.connect.mock.calls.length === 1);
      await vi.advanceTimersByTimeAsync(10_000);
      await tick();

      expect(root.getValue().getState()).toMatchObject({
        connectionState: "connecting",
        tools: [],
        lastError: null,
      });
      expect(mocks.transports[0].close).not.toHaveBeenCalled();
    } finally {
      root.unmount();
    }
  });
});

describe("McpServerResource completeAuth", () => {
  beforeEach(resetMocks);

  it("rejects when the callback URL has no authorization code", async () => {
    const root = mount();

    try {
      await expect(
        root.getValue().completeAuth("https://example.com/callback?state=abc"),
      ).rejects.toThrow("missing authorization code in callback URL");
      await flushMacrotask();

      expect(root.getValue().getState()).toMatchObject({
        connectionState: "error",
        lastError: {
          message: "missing authorization code in callback URL",
        },
      });
    } finally {
      root.unmount();
    }
  });

  it("rejects after storing finishAuth failures on the server state", async () => {
    mocks.finishAuthResults.push(() =>
      Promise.reject(new Error("invalid_grant")),
    );
    const root = mount({ auth: { type: "oauth" } });

    try {
      await expect(
        root.getValue().completeAuth("https://example.com/callback?code=abc"),
      ).rejects.toThrow("invalid_grant");
      await flushMacrotask();

      expect(root.getValue().getState()).toMatchObject({
        connectionState: "error",
        lastError: {
          message: "invalid_grant",
        },
      });
      expect(mocks.transports[0].finishAuth).toHaveBeenCalledWith("abc");
      expect(mocks.transports[0].close).toHaveBeenCalledTimes(1);
    } finally {
      root.unmount();
    }
  });
});

describe("McpServerResource stale connect results", () => {
  beforeEach(resetMocks);

  it("keeps a later disconnect when an earlier connect completes late", async () => {
    const staleList = deferred<{ tools: ReturnType<typeof tool>[] }>();
    mocks.listToolsResults.push(() => staleList.promise);
    const root = mount();

    try {
      const connectPromise = root.getValue().connect();
      await waitFor(() => mocks.clients[0]?.listTools.mock.calls.length === 1);

      await root.getValue().disconnect();
      staleList.resolve({ tools: [tool("stale")] });
      await connectPromise;
      await flushMacrotask();

      expect(root.getValue().getState()).toMatchObject({
        connectionState: "disconnected",
        tools: [],
        lastError: null,
      });
      expect(mocks.transports[0].close).toHaveBeenCalledTimes(1);
    } finally {
      root.unmount();
    }
  });

  it("keeps the latest connect result when an older connect finishes later", async () => {
    const staleList = deferred<{ tools: ReturnType<typeof tool>[] }>();
    mocks.listToolsResults.push(
      () => staleList.promise,
      () => Promise.resolve({ tools: [tool("fresh")] }),
    );
    const root = mount();

    try {
      const firstConnectPromise = root.getValue().connect();
      await waitFor(() => mocks.clients[0]?.listTools.mock.calls.length === 1);

      await root.getValue().connect();
      staleList.resolve({ tools: [tool("stale")] });
      await firstConnectPromise;
      await flushMacrotask();

      expect(root.getValue().getState()).toMatchObject({
        connectionState: "connected",
        tools: [tool("fresh")],
        lastError: null,
      });
      expect(mocks.transports[0].close).toHaveBeenCalledTimes(1);
      expect(mocks.transports[1].close).not.toHaveBeenCalled();
    } finally {
      root.unmount();
    }
  });

  it("ignores stale connect errors after a newer connect succeeds", async () => {
    const staleList = deferred<{ tools: ReturnType<typeof tool>[] }>();
    mocks.listToolsResults.push(
      () => staleList.promise,
      () => Promise.resolve({ tools: [tool("fresh")] }),
    );
    const root = mount();

    try {
      const firstConnectPromise = root.getValue().connect();
      await waitFor(() => mocks.clients[0]?.listTools.mock.calls.length === 1);

      await root.getValue().connect();
      staleList.reject(new Error("stale list failed"));
      await firstConnectPromise;
      await flushMacrotask();

      expect(root.getValue().getState()).toMatchObject({
        connectionState: "connected",
        tools: [tool("fresh")],
        lastError: null,
      });
      expect(mocks.transports[0].close).toHaveBeenCalledTimes(1);
    } finally {
      root.unmount();
    }
  });
});
