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
    this.requestHandlers = new Map();
    this.notificationHandlers = new Map();
    this.setRequestHandler = vi.fn((method, handler) => {
      this.requestHandlers.set(method, handler);
    });
    this.setNotificationHandler = vi.fn((method, handler) => {
      this.notificationHandlers.set(method, handler);
    });
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

const waitForResourceUpdate = async (predicate: () => boolean) => {
  for (let i = 0; i < 20; i++) {
    if (predicate()) return;
    await flushMacrotask();
  }
  expect(predicate()).toBe(true);
};

const requestElicitation = (
  client: any,
  message: string,
  requestedSchema: unknown,
  context: { signal: AbortSignal } = {
    signal: new AbortController().signal,
  },
) => {
  const handler = client.requestHandlers.get("elicitation/create");
  if (!handler) throw new Error("elicitation/create handler not registered");
  return handler(
    {
      method: "elicitation/create",
      params: { message, requestedSchema },
    },
    context,
  );
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
    cache?: { readonly defaultTtlMs?: number } | undefined;
    elicitation?: boolean | undefined;
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
        cache: props?.cache,
        ...(props?.elicitation !== undefined
          ? { elicitation: props.elicitation }
          : {}),
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

describe("McpServerResource elicitation", () => {
  beforeEach(resetMocks);

  it("surfaces pending elicitation requests in server state", async () => {
    const root = mount();
    const requestedSchema = {
      type: "object",
      properties: {
        answer: { type: "string" },
      },
    };

    try {
      await root.getValue().connect();
      const response = requestElicitation(
        mocks.clients[0],
        "Provide an answer",
        requestedSchema,
      );
      await waitForResourceUpdate(
        () => root.getValue().getState().pendingElicitations.length === 1,
      );

      const [elicitation] = root.getValue().getState().pendingElicitations;
      expect(elicitation).toEqual({
        id: expect.any(String),
        message: "Provide an answer",
        requestedSchema,
      });

      root.getValue().answerElicitation(elicitation!.id, {
        action: "cancel",
      });
      await expect(response).resolves.toEqual({ action: "cancel" });
    } finally {
      root.unmount();
    }
  });

  it("answers pending elicitations with accepted content", async () => {
    const root = mount();

    try {
      await root.getValue().connect();
      const response = requestElicitation(mocks.clients[0], "Choose a color", {
        type: "object",
        properties: {
          color: { type: "string" },
        },
      });
      await waitForResourceUpdate(
        () => root.getValue().getState().pendingElicitations.length === 1,
      );
      const [elicitation] = root.getValue().getState().pendingElicitations;
      const content = { color: "blue" };

      expect(
        root
          .getValue()
          .answerElicitation(elicitation!.id, { action: "accept", content }),
      ).toBeUndefined();

      await expect(response).resolves.toEqual({
        action: "accept",
        content,
      });
      await waitForResourceUpdate(
        () => root.getValue().getState().pendingElicitations.length === 0,
      );
    } finally {
      root.unmount();
    }
  });

  it("keeps invalid accepted content pending until a valid response arrives", async () => {
    const root = mount();

    try {
      await root.getValue().connect();
      const response = requestElicitation(mocks.clients[0], "Choose a color", {
        type: "object",
        required: ["color"],
        properties: {
          color: { type: "string" },
        },
      });
      let resolved = false;
      void response.then(() => {
        resolved = true;
      });
      await waitForResourceUpdate(
        () => root.getValue().getState().pendingElicitations.length === 1,
      );
      const [elicitation] = root.getValue().getState().pendingElicitations;

      expect(
        root.getValue().answerElicitation(elicitation!.id, {
          action: "accept",
          content: { color: 1 },
        }),
      ).toEqual([{ property: "color", message: "Expected a string." }]);

      await waitForResourceUpdate(
        () =>
          root.getValue().getState().pendingElicitations[0]?.error?.message ===
          "Invalid elicitation content: color.",
      );
      expect(root.getValue().getState().pendingElicitations).toEqual([
        expect.objectContaining({
          id: elicitation!.id,
          error: {
            message: "Invalid elicitation content: color.",
            properties: ["color"],
          },
        }),
      ]);
      await tick();
      expect(resolved).toBe(false);

      expect(
        root.getValue().answerElicitation(elicitation!.id, {
          action: "accept",
          content: { color: "blue" },
        }),
      ).toBeUndefined();

      await expect(response).resolves.toEqual({
        action: "accept",
        content: { color: "blue" },
      });
      await waitForResourceUpdate(
        () => root.getValue().getState().pendingElicitations.length === 0,
      );
    } finally {
      root.unmount();
    }
  });

  it("declines an elicitation that carries a validation error", async () => {
    const root = mount();

    try {
      await root.getValue().connect();
      const response = requestElicitation(mocks.clients[0], "Choose a color", {
        type: "object",
        required: ["color"],
        properties: {
          color: { type: "string" },
        },
      });
      await waitForResourceUpdate(
        () => root.getValue().getState().pendingElicitations.length === 1,
      );
      const [elicitation] = root.getValue().getState().pendingElicitations;

      root.getValue().answerElicitation(elicitation!.id, {
        action: "accept",
        content: {},
      });
      await waitForResourceUpdate(
        () =>
          root.getValue().getState().pendingElicitations[0]?.error !==
          undefined,
      );

      root.getValue().answerElicitation(elicitation!.id, { action: "decline" });

      await expect(response).resolves.toEqual({ action: "decline" });
      await waitForResourceUpdate(
        () => root.getValue().getState().pendingElicitations.length === 0,
      );
    } finally {
      root.unmount();
    }
  });

  it("declines pending elicitations", async () => {
    const root = mount();

    try {
      await root.getValue().connect();
      const response = requestElicitation(mocks.clients[0], "Confirm access", {
        type: "object",
        properties: {},
      });
      await waitForResourceUpdate(
        () => root.getValue().getState().pendingElicitations.length === 1,
      );
      const [elicitation] = root.getValue().getState().pendingElicitations;

      root.getValue().answerElicitation(elicitation!.id, {
        action: "decline",
      });

      await expect(response).resolves.toEqual({ action: "decline" });
      await waitForResourceUpdate(
        () => root.getValue().getState().pendingElicitations.length === 0,
      );
    } finally {
      root.unmount();
    }
  });

  it("cancels pending elicitations", async () => {
    const root = mount();

    try {
      await root.getValue().connect();
      const response = requestElicitation(mocks.clients[0], "Confirm access", {
        type: "object",
        properties: {},
      });
      await waitForResourceUpdate(
        () => root.getValue().getState().pendingElicitations.length === 1,
      );
      const [elicitation] = root.getValue().getState().pendingElicitations;

      root.getValue().answerElicitation(elicitation!.id, {
        action: "cancel",
      });

      await expect(response).resolves.toEqual({ action: "cancel" });
      await waitForResourceUpdate(
        () => root.getValue().getState().pendingElicitations.length === 0,
      );
    } finally {
      root.unmount();
    }
  });

  it("ignores answers for unknown elicitations", () => {
    const root = mount();

    try {
      expect(
        root
          .getValue()
          .answerElicitation("missing-elicitation", { action: "cancel" }),
      ).toBeUndefined();
      expect(root.getValue().getState().pendingElicitations).toEqual([]);
    } finally {
      root.unmount();
    }
  });

  it("returns validation errors for accepted elicitation content that is not an object", async () => {
    const root = mount();

    try {
      await root.getValue().connect();
      const response = requestElicitation(mocks.clients[0], "Confirm access", {
        type: "object",
        properties: {},
      });
      await waitForResourceUpdate(
        () => root.getValue().getState().pendingElicitations.length === 1,
      );
      const [elicitation] = root.getValue().getState().pendingElicitations;

      expect(
        root.getValue().answerElicitation(elicitation!.id, {
          action: "accept",
          content: null as never,
        }),
      ).toEqual([
        { property: "content", message: "Response content must be an object." },
      ]);
      await waitForResourceUpdate(
        () =>
          root.getValue().getState().pendingElicitations[0]?.error?.message ===
          "Invalid elicitation content: content.",
      );
      expect(root.getValue().getState().pendingElicitations).toEqual([
        expect.objectContaining({
          id: elicitation!.id,
          error: {
            message: "Invalid elicitation content: content.",
            properties: ["content"],
          },
        }),
      ]);

      await root.getValue().disconnect();
      await expect(response).resolves.toEqual({ action: "cancel" });
    } finally {
      root.unmount();
    }
  });

  it("cancels pending elicitations on disconnect", async () => {
    const root = mount();

    try {
      await root.getValue().connect();
      const response = requestElicitation(mocks.clients[0], "Confirm access", {
        type: "object",
        properties: {},
      });
      await waitForResourceUpdate(
        () => root.getValue().getState().pendingElicitations.length === 1,
      );

      await root.getValue().disconnect();

      await expect(response).resolves.toEqual({ action: "cancel" });
      await waitForResourceUpdate(
        () => root.getValue().getState().pendingElicitations.length === 0,
      );
    } finally {
      root.unmount();
    }
  });

  it("cancels pending elicitations when the server aborts the request", async () => {
    const root = mount();
    const controller = new AbortController();

    try {
      await root.getValue().connect();
      const response = requestElicitation(
        mocks.clients[0],
        "Confirm access",
        {
          type: "object",
          properties: {},
        },
        { signal: controller.signal },
      );
      await waitForResourceUpdate(
        () => root.getValue().getState().pendingElicitations.length === 1,
      );

      controller.abort();

      await expect(response).resolves.toEqual({ action: "cancel" });
      await waitForResourceUpdate(
        () => root.getValue().getState().pendingElicitations.length === 0,
      );
    } finally {
      root.unmount();
    }
  });

  it("cancels pending elicitations on unmount", async () => {
    const root = mount();
    let didUnmount = false;

    try {
      await root.getValue().connect();
      const response = requestElicitation(mocks.clients[0], "Confirm access", {
        type: "object",
        properties: {},
      });
      await waitForResourceUpdate(
        () => root.getValue().getState().pendingElicitations.length === 1,
      );

      root.unmount();
      didUnmount = true;
      await flushMacrotask();

      await expect(response).resolves.toEqual({ action: "cancel" });
    } finally {
      if (!didUnmount) root.unmount();
    }
  });

  it("cancels requests from stale connections without surfacing them", async () => {
    const root = mount();

    try {
      await root.getValue().connect();
      await root.getValue().connect();

      await expect(
        requestElicitation(mocks.clients[0], "Confirm access", {
          type: "object",
          properties: {},
        }),
      ).resolves.toEqual({ action: "cancel" });
      expect(root.getValue().getState().pendingElicitations).toEqual([]);
    } finally {
      root.unmount();
    }
  });

  it("advertises form elicitation capability and registers its handler by default", async () => {
    const root = mount();

    try {
      await root.getValue().connect();

      expect(mocks.Client).toHaveBeenCalledWith(
        {
          name: "assistant-ui-mcp",
          version: "0.0.0",
        },
        {
          capabilities: {
            elicitation: {},
          },
          listChanged: {
            tools: {
              autoRefresh: true,
              debounceMs: 300,
              onChanged: expect.any(Function),
            },
          },
        },
      );
      expect(mocks.clients[0].setRequestHandler).toHaveBeenCalledWith(
        "elicitation/create",
        expect.any(Function),
      );
    } finally {
      root.unmount();
    }
  });

  it("does not advertise or handle elicitation when opted out", async () => {
    const root = mount({ elicitation: false });

    try {
      await root.getValue().connect();

      const clientOptions = mocks.Client.mock.calls[0]?.[1];
      expect(clientOptions).not.toHaveProperty("capabilities.elicitation");
      expect(mocks.clients[0].setRequestHandler).not.toHaveBeenCalledWith(
        "elicitation/create",
        expect.any(Function),
      );
    } finally {
      root.unmount();
    }
  });
});

describe("McpServerResource tools listChanged", () => {
  beforeEach(resetMocks);

  it("opts into automatic listChanged tool refreshes", async () => {
    const root = mount();

    try {
      await root.getValue().connect();

      expect(mocks.Client).toHaveBeenCalledWith(
        {
          name: "assistant-ui-mcp",
          version: "0.0.0",
        },
        {
          capabilities: {
            elicitation: {},
          },
          listChanged: {
            tools: {
              autoRefresh: true,
              debounceMs: 300,
              onChanged: expect.any(Function),
            },
          },
        },
      );
      expect(mocks.clients[0].setNotificationHandler).not.toHaveBeenCalled();
    } finally {
      root.unmount();
    }
  });

  it("applies refreshed tools from the listChanged callback", async () => {
    mocks.listToolsResults.push(async () => ({
      tools: [
        {
          name: "search",
          description: "Search docs",
          inputSchema: { type: "object" },
        },
      ],
    }));
    const root = mount();

    try {
      await root.getValue().connect();
      await waitForResourceUpdate(
        () => root.getValue().getState().tools.length === 1,
      );
      expect(root.getValue().getState().tools).toEqual([
        {
          name: "search",
          description: "Search docs",
          inputSchema: { type: "object" },
        },
      ]);

      const onChanged =
        mocks.Client.mock.calls[0]?.[1]?.listChanged?.tools?.onChanged;
      if (!onChanged) throw new Error("Expected tools listChanged callback");
      onChanged(null, [
        {
          name: "search",
          description: "Search docs",
          inputSchema: { type: "object" },
        },
        {
          name: "summarize",
          inputSchema: { type: "object", properties: {} },
        },
      ]);
      await waitForResourceUpdate(
        () => root.getValue().getState().tools.length === 2,
      );

      expect(mocks.clients[0].listTools).toHaveBeenCalledTimes(1);
      expect(root.getValue().getState().tools).toEqual([
        {
          name: "search",
          description: "Search docs",
          inputSchema: { type: "object" },
        },
        {
          name: "summarize",
          inputSchema: { type: "object", properties: {} },
        },
      ]);
    } finally {
      root.unmount();
    }
  });

  it("stores listChanged errors without replacing the current tools", async () => {
    mocks.listToolsResults.push(async () => ({
      tools: [
        {
          name: "search",
          description: "Search docs",
          inputSchema: { type: "object" },
        },
      ],
    }));
    const root = mount();

    try {
      await root.getValue().connect();
      await waitForResourceUpdate(
        () => root.getValue().getState().tools.length === 1,
      );
      const onChanged =
        mocks.Client.mock.calls[0]?.[1]?.listChanged?.tools?.onChanged;
      if (!onChanged) throw new Error("Expected tools listChanged callback");

      onChanged(new Error("tool update failed"), null);
      await waitForResourceUpdate(
        () =>
          root.getValue().getState().lastError?.message ===
          "tool update failed",
      );

      expect(root.getValue().getState()).toMatchObject({
        connectionState: "connected",
        lastError: { message: "tool update failed" },
        tools: [
          {
            name: "search",
            description: "Search docs",
            inputSchema: { type: "object" },
          },
        ],
      });

      onChanged(null, [
        {
          name: "summarize",
          inputSchema: { type: "object", properties: {} },
        },
      ]);
      await waitForResourceUpdate(
        () => root.getValue().getState().lastError === null,
      );

      expect(root.getValue().getState().tools).toEqual([
        {
          name: "summarize",
          inputSchema: { type: "object", properties: {} },
        },
      ]);
    } finally {
      root.unmount();
    }
  });

  it("ignores listChanged callbacks from a stale connection generation", async () => {
    mocks.listToolsResults.push(async () => ({
      tools: [
        {
          name: "first",
          inputSchema: { type: "object" },
        },
      ],
    }));
    mocks.listToolsResults.push(async () => ({
      tools: [
        {
          name: "second",
          inputSchema: { type: "object" },
        },
      ],
    }));
    const root = mount();

    try {
      await root.getValue().connect();
      const staleOnChanged =
        mocks.Client.mock.calls[0]?.[1]?.listChanged?.tools?.onChanged;
      if (!staleOnChanged)
        throw new Error("Expected tools listChanged callback");
      await root.getValue().connect();
      await waitForResourceUpdate(
        () => root.getValue().getState().tools[0]?.name === "second",
      );

      expect(root.getValue().getState().tools).toEqual([
        {
          name: "second",
          inputSchema: { type: "object" },
        },
      ]);

      staleOnChanged(null, [
        {
          name: "stale-tool",
          inputSchema: { type: "object" },
        },
      ]);
      await flushMacrotask();

      expect(root.getValue().getState().tools).toEqual([
        {
          name: "second",
          inputSchema: { type: "object" },
        },
      ]);
      expect(mocks.clients[0].listTools).toHaveBeenCalledTimes(1);
    } finally {
      root.unmount();
    }
  });

  it("passes defaultCacheTtlMs when cache.defaultTtlMs is configured", async () => {
    const root = mount({ cache: { defaultTtlMs: 5_000 } });

    try {
      await root.getValue().connect();

      expect(mocks.Client).toHaveBeenCalledWith(
        {
          name: "assistant-ui-mcp",
          version: "0.0.0",
        },
        {
          capabilities: {
            elicitation: {},
          },
          listChanged: {
            tools: {
              autoRefresh: true,
              debounceMs: 300,
              onChanged: expect.any(Function),
            },
          },
          defaultCacheTtlMs: 5_000,
        },
      );
    } finally {
      root.unmount();
    }
  });

  it("omits defaultCacheTtlMs when cache is not configured", async () => {
    const root = mount();

    try {
      await root.getValue().connect();

      const options = mocks.Client.mock.calls[0]?.[1];
      expect(options).not.toHaveProperty("defaultCacheTtlMs");
    } finally {
      root.unmount();
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
