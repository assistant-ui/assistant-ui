import { createTapRoot, useResource } from "@assistant-ui/tap";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
      this.url = url;
      this.options = options;
      this.close = vi.fn(() => Promise.resolve());
      this.finishAuth = vi.fn(() => Promise.resolve());
      transports.push(this);
    });

  return {
    Client,
    StreamableHTTPClientTransport,
    clients,
    transports,
    connectResults,
    listToolsResults,
  };
});

vi.mock("@modelcontextprotocol/sdk/client/index.js", () => ({
  Client: mocks.Client,
}));

vi.mock("@modelcontextprotocol/sdk/client/streamableHttp.js", () => ({
  StreamableHTTPClientTransport: mocks.StreamableHTTPClientTransport,
}));

const { McpServerResource } = await import("./McpServerResource");

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

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

const mount = () => {
  const props = {
    id: "docs",
    kind: "connector" as const,
    name: "Docs",
    url: "https://example.com/mcp",
    auth: { type: "none" as const },
    storage: createStorage(),
    redirectUri: "https://example.com/callback",
    autoConnect: false,
    onRemove: vi.fn(async () => {}),
  };

  return createTapRoot(function Root() {
    return useResource(McpServerResource(props));
  });
};

describe("McpServerResource", () => {
  beforeEach(() => {
    mocks.clients.length = 0;
    mocks.transports.length = 0;
    mocks.connectResults.length = 0;
    mocks.listToolsResults.length = 0;
    mocks.Client.mockClear();
    mocks.StreamableHTTPClientTransport.mockClear();
  });

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
      await tick();

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
      await tick();

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
      await tick();

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
