import { createTapRoot, useResource } from "@assistant-ui/tap";
import type { ClientOutput } from "@assistant-ui/store";
import { useEffect } from "react";
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
  const closeResults: Array<() => Promise<void>> = [];

  const Client = vi.fn().mockImplementation(function Client(this: any) {
    const index = clients.length;
    this.connect = vi.fn(() => connectResults[index]?.() ?? Promise.resolve());
    this.listTools = vi.fn(
      () => listToolsResults[index]?.() ?? Promise.resolve({ tools: [] }),
    );
    this.callTool = vi.fn();
    this.listResources = vi.fn(() => Promise.resolve({ resources: [] }));
    this.readResource = vi.fn();
    clients.push(this);
  });

  const StreamableHTTPClientTransport = vi
    .fn()
    .mockImplementation(function StreamableHTTPClientTransport(this: any) {
      const index = transports.length;
      this.close = vi.fn(() => closeResults[index]?.() ?? Promise.resolve());
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
    closeResults,
  };
});

vi.mock("@modelcontextprotocol/client", async (importOriginal) => ({
  ...(await importOriginal()),
  Client: mocks.Client,
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
  mocks.closeResults.length = 0;
  mocks.Client.mockClear();
  mocks.StreamableHTTPClientTransport.mockClear();
};

const mount = (
  props?: {
    auth?: MCPAuthConfig | undefined;
    connectionTimeout?: number | undefined;
  },
  onMount?: (server: ClientOutput<"mcpServer">) => void,
) => {
  const connectionTimeout =
    props && "connectionTimeout" in props ? props.connectionTimeout : 10_000;

  return createTapRoot(function Root() {
    const server = useResource(
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
    useEffect(() => {
      onMount?.(server);
    }, [server]);
    return server;
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

describe("McpServerResource connection lifecycle", () => {
  beforeEach(resetMocks);

  it("closes a pending connection when the resource unmounts", async () => {
    let resolveConnect!: () => void;
    mocks.connectResults.push(
      () =>
        new Promise<void>((resolve) => {
          resolveConnect = resolve;
        }),
    );
    const root = mount({ connectionTimeout: undefined });
    let didUnmount = false;
    try {
      const connectPromise = root.getValue().connect();
      await waitFor(() => mocks.clients[0]?.connect.mock.calls.length === 1);

      root.unmount();
      didUnmount = true;
      await flushMacrotask();

      expect(mocks.transports[0].close).toHaveBeenCalledTimes(1);

      resolveConnect();
      await connectPromise;

      expect(mocks.clients[0].listTools).not.toHaveBeenCalled();
      expect(mocks.transports[0].close).toHaveBeenCalledTimes(1);
    } finally {
      if (!didUnmount) root.unmount();
    }
  });

  it("waits for pending transports to close before a newer reconnect", async () => {
    let resolveFirstConnect!: () => void;
    let resolveFirstClose!: () => void;
    mocks.connectResults.push(
      () =>
        new Promise<void>((resolve) => {
          resolveFirstConnect = resolve;
        }),
    );
    mocks.closeResults.push(
      () =>
        new Promise<void>((resolve) => {
          resolveFirstClose = resolve;
        }),
    );
    const root = mount({ connectionTimeout: undefined });

    try {
      const firstConnect = root.getValue().connect();
      await waitFor(() => mocks.clients[0]?.connect.mock.calls.length === 1);

      const supersededReconnect = root.getValue().connect();
      await waitFor(() => mocks.transports[0]?.close.mock.calls.length === 1);

      const latestReconnect = root.getValue().connect();
      await flushMacrotask();
      expect(mocks.transports).toHaveLength(1);

      resolveFirstClose();
      await supersededReconnect;
      await waitFor(() => mocks.clients[1]?.connect.mock.calls.length === 1);
      await latestReconnect;

      resolveFirstConnect();
      await firstConnect;
    } finally {
      root.unmount();
    }
  });
});

describe("McpServerResource completeAuth", () => {
  beforeEach(resetMocks);

  it("completes auth across the StrictMode effect replay", async () => {
    let completeAuth: Promise<void> | undefined;
    let started = false;
    const root = mount({ auth: { type: "oauth" } }, (server) => {
      if (started) return;
      started = true;
      completeAuth = server.completeAuth(
        "https://example.com/callback?code=abc",
      );
    });

    try {
      await expect(completeAuth).resolves.toBeUndefined();
      await flushMacrotask();

      expect(mocks.transports[0].finishAuth).toHaveBeenCalledTimes(1);
      expect(root.getValue().getState().connectionState).toBe("connected");
    } finally {
      root.unmount();
    }
  });

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

  it("rejects when the resource unmounts during auth completion", async () => {
    let resolveFinishAuth!: () => void;
    mocks.finishAuthResults.push(
      () =>
        new Promise<void>((resolve) => {
          resolveFinishAuth = resolve;
        }),
    );
    const root = mount({ auth: { type: "oauth" } });
    let didUnmount = false;

    try {
      const completeAuth = root
        .getValue()
        .completeAuth("https://example.com/callback?code=abc");
      await waitFor(
        () => mocks.transports[0]?.finishAuth.mock.calls.length === 1,
      );

      root.unmount();
      didUnmount = true;
      resolveFinishAuth();

      await expect(completeAuth).rejects.toThrow(
        'MCP server "docs" authorization was interrupted before completion.',
      );
    } finally {
      if (!didUnmount) root.unmount();
    }
  });

  it("normalizes late auth failures after unmount", async () => {
    let rejectFinishAuth!: (error: Error) => void;
    mocks.finishAuthResults.push(
      () =>
        new Promise<void>((_, reject) => {
          rejectFinishAuth = reject;
        }),
    );
    const root = mount({ auth: { type: "oauth" } });
    let didUnmount = false;

    try {
      const completeAuth = root
        .getValue()
        .completeAuth("https://example.com/callback?code=abc");
      await waitFor(
        () => mocks.transports[0]?.finishAuth.mock.calls.length === 1,
      );

      root.unmount();
      didUnmount = true;
      const finishAuthError = new Error("Connection closed");
      rejectFinishAuth(finishAuthError);

      await expect(completeAuth).rejects.toMatchObject({
        message:
          'MCP server "docs" authorization was interrupted before completion.',
        cause: finishAuthError,
      });
    } finally {
      if (!didUnmount) root.unmount();
    }
  });
});

describe("McpServerResource resource methods", () => {
  beforeEach(() => {
    mocks.clients.length = 0;
    mocks.transports.length = 0;
    mocks.connectResults.length = 0;
    mocks.listToolsResults.length = 0;
    mocks.Client.mockClear();
    mocks.StreamableHTTPClientTransport.mockClear();
  });

  it("lists resources from a connected server", async () => {
    const result = {
      resources: [
        {
          uri: "docs://intro",
          name: "Intro",
          mimeType: "text/markdown",
        },
      ],
    };
    const root = mount();

    try {
      await root.getValue().connect();
      mocks.clients[0].listResources.mockResolvedValueOnce(result);

      await expect(root.getValue().listResources()).resolves.toBe(result);
      expect(mocks.clients[0].listResources).toHaveBeenCalledTimes(1);
    } finally {
      root.unmount();
    }
  });

  it("forwards the resource pagination cursor", async () => {
    const result = {
      resources: [{ uri: "docs://page-two", name: "Page two" }],
    };
    const root = mount();

    try {
      await root.getValue().connect();
      mocks.clients[0].listResources.mockResolvedValueOnce(result);

      await expect(
        root.getValue().listResources({ cursor: "next-page" }),
      ).resolves.toBe(result);
      expect(mocks.clients[0].listResources).toHaveBeenCalledWith({
        cursor: "next-page",
      });
    } finally {
      root.unmount();
    }
  });

  it("rejects listResources when the server is disconnected", async () => {
    const root = mount();

    try {
      await expect(root.getValue().listResources()).rejects.toThrow(
        'MCP server "docs" is not connected',
      );
    } finally {
      root.unmount();
    }
  });
});
