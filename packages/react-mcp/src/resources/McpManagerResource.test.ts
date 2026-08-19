import { createTapRoot, resource, useResource } from "@assistant-ui/tap";
import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { defineConnector } from "../connector";
import type { MCPConnector } from "../mcp-scope";
import { assertUniqueServerIds } from "../utils/serverId";
import { McpManagerResource } from "./McpManagerResource";
import { McpCustomStorage } from "./storage/McpCustomStorage";
import { McpMemoryStorage } from "./storage/McpMemoryStorage";
import type { MCPStorageElement } from "./storage/types";

const mocks = vi.hoisted(() => {
  const Client = vi.fn().mockImplementation(function Client(this: any) {
    this.connect = vi.fn(async () => {});
    this.listTools = vi.fn(async () => ({ tools: [] }));
    this.setRequestHandler = vi.fn();
    this.setNotificationHandler = vi.fn();
  });
  const StreamableHTTPClientTransport = vi
    .fn()
    .mockImplementation(function StreamableHTTPClientTransport(this: any) {
      this.close = vi.fn(async () => {});
    });

  return { Client, StreamableHTTPClientTransport };
});

vi.mock("@modelcontextprotocol/client", async (importOriginal) => ({
  ...(await importOriginal()),
  Client: mocks.Client,
  StreamableHTTPClientTransport: mocks.StreamableHTTPClientTransport,
}));

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal()),
  useAssistantClientRef: () => ({ current: null }),
}));

vi.mock("@assistant-ui/store/client", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@assistant-ui/store/client")>();
  const { useEffect } = await import("react");
  const useScopeEffectShim = (
    _scope: string,
    effect: () => (() => void) | void,
    deps: readonly unknown[],
  ) => {
    useEffect(() => {
      const cleanup = effect();
      return typeof cleanup === "function" ? cleanup : undefined;
      // oxlint-disable-next-line react-hooks/exhaustive-deps -- caller-provided deps, mirrors the real hook
    }, deps);
  };
  return {
    ...actual,
    useAssistantScopeEffect: useScopeEffectShim,
  };
});

const connector = (id: string, name = id): MCPConnector =>
  defineConnector({
    id,
    name,
    url: `https://example.com/${id}/mcp`,
    auth: { type: "none" },
  });

const mount = (
  connectors: MCPConnector[],
  storage: MCPStorageElement = McpMemoryStorage(),
) =>
  createTapRoot(function Root() {
    return useResource(
      McpManagerResource({
        connectors,
        storage,
        autoConnect: false,
      }),
    );
  });

describe("McpManagerResource server ids", () => {
  it("throws when connectors reuse an id", () => {
    expect(() =>
      mount([connector("docs", "Docs"), connector("docs", "Internal Docs")]),
    ).toThrow(
      'McpManagerResource received duplicate MCP server id "docs". Server ids must be unique because they are used for lookups, OAuth routing, and tool name prefixes.',
    );
  });

  it("allows distinct ids", () => {
    expect(() => assertUniqueServerIds(["docs", "linear"])).not.toThrow();
  });

  it("passes connector cache configuration to its client", async () => {
    mocks.Client.mockClear();
    const root = mount([
      defineConnector({
        id: "docs",
        name: "Docs",
        url: "https://example.com/docs/mcp",
        auth: { type: "none" },
        cache: { defaultTtlMs: 5_000 },
      }),
    ]);

    try {
      await root.getValue().connector({ index: 0 }).connect();

      expect(mocks.Client).toHaveBeenCalledWith(
        {
          name: "assistant-ui-mcp",
          version: "0.0.0",
        },
        expect.objectContaining({ defaultCacheTtlMs: 5_000 }),
      );
    } finally {
      root.unmount();
    }
  });

  it("passes custom server cache configuration to its client", async () => {
    mocks.Client.mockClear();
    const root = mount([]);

    try {
      const id = await root.getValue().addCustomServer({
        name: "Docs",
        url: "https://example.com/docs/mcp",
        auth: { type: "none" },
        cache: { defaultTtlMs: 5_000 },
      });

      await vi.waitFor(() =>
        expect(root.getValue().getState().customServers).toHaveLength(1),
      );
      await root.getValue().server({ id }).connect();

      expect(mocks.Client).toHaveBeenCalledWith(
        {
          name: "assistant-ui-mcp",
          version: "0.0.0",
        },
        expect.objectContaining({ defaultCacheTtlMs: 5_000 }),
      );
    } finally {
      root.unmount();
    }
  });
});

describe("McpManagerResource storage failures", () => {
  it("handles custom server load failures", async () => {
    const error = new Error("load failed");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const root = mount(
      [],
      McpCustomStorage({
        loadCustomServers: vi.fn(async () => {
          throw error;
        }),
        saveCustomServers: vi.fn(async () => {}),
        loadAuthState: vi.fn(async () => null),
        saveAuthState: vi.fn(async () => {}),
        clearAuthState: vi.fn(async () => {}),
      }),
    );

    try {
      await vi.waitFor(() =>
        expect(root.getValue().getState().isHydrated).toBe(true),
      );
      expect(root.getValue().getState().customServers).toHaveLength(0);
      expect(consoleError).toHaveBeenCalledWith(
        "[assistant-ui/react-mcp] failed to load custom servers:",
        error,
      );
    } finally {
      root.unmount();
      consoleError.mockRestore();
    }
  });

  it("handles custom server save failures", async () => {
    const error = new Error("save failed");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const saveCustomServers = vi.fn(async () => {});
    const root = mount(
      [],
      McpCustomStorage({
        loadCustomServers: vi.fn(async () => []),
        saveCustomServers,
        loadAuthState: vi.fn(async () => null),
        saveAuthState: vi.fn(async () => {}),
        clearAuthState: vi.fn(async () => {}),
      }),
    );

    try {
      await vi.waitFor(() =>
        expect(root.getValue().getState().isHydrated).toBe(true),
      );
      await vi.waitFor(() => expect(saveCustomServers).toHaveBeenCalled());
      saveCustomServers.mockClear();
      saveCustomServers.mockRejectedValue(error);

      await root.getValue().addCustomServer({
        name: "Docs",
        url: "https://example.com/docs/mcp",
        auth: { type: "none" },
      });

      await vi.waitFor(() => {
        expect(saveCustomServers).toHaveBeenCalledWith([
          expect.objectContaining({ name: "Docs" }),
        ]);
        expect(root.getValue().getState().customServers).toHaveLength(1);
      });
      expect(consoleError).toHaveBeenCalledWith(
        "[assistant-ui/react-mcp] failed to save custom servers:",
        error,
      );
    } finally {
      root.unmount();
      consoleError.mockRestore();
    }
  });
});

describe("McpManagerResource storage ordering", () => {
  it("persists custom server updates in invocation order", async () => {
    let resolveFirstSave: (() => void) | undefined;
    const firstSave = new Promise<void>((resolve) => {
      resolveFirstSave = resolve;
    });
    let blockNextSave = false;
    const persistedSnapshots: string[][] = [];
    const saveCustomServers = vi.fn(async (records: { name: string }[]) => {
      persistedSnapshots.push(records.map((record) => record.name));
      if (blockNextSave) {
        blockNextSave = false;
        await firstSave;
      }
    });
    const root = mount(
      [],
      McpCustomStorage({
        loadCustomServers: vi.fn(async () => []),
        saveCustomServers,
        loadAuthState: vi.fn(async () => null),
        saveAuthState: vi.fn(async () => {}),
        clearAuthState: vi.fn(async () => {}),
      }),
    );

    try {
      await vi.waitFor(() =>
        expect(root.getValue().getState().isHydrated).toBe(true),
      );
      await vi.waitFor(() => expect(saveCustomServers).toHaveBeenCalled());
      saveCustomServers.mockClear();
      persistedSnapshots.length = 0;
      blockNextSave = true;

      await root.getValue().addCustomServer({
        name: "Docs",
        url: "https://example.com/docs/mcp",
        auth: { type: "none" },
      });
      await vi.waitFor(() =>
        expect(saveCustomServers).toHaveBeenCalledTimes(1),
      );

      await root.getValue().addCustomServer({
        name: "Linear",
        url: "https://example.com/linear/mcp",
        auth: { type: "none" },
      });

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(saveCustomServers).toHaveBeenCalledTimes(1);

      resolveFirstSave?.();
      await vi.waitFor(() =>
        expect(saveCustomServers).toHaveBeenCalledTimes(2),
      );
      expect(persistedSnapshots).toEqual([["Docs"], ["Docs", "Linear"]]);
    } finally {
      resolveFirstSave?.();
      root.unmount();
    }
  });

  it("does not persist unchanged servers when inline storage rerenders", async () => {
    const saveCustomServers = vi.fn(async () => {});
    let rerender = () => {};
    const DynamicManager = resource(function useDynamicManager() {
      const [, setVersion] = useState(0);
      rerender = () => setVersion((version) => version + 1);

      return useResource(
        McpManagerResource({
          connectors: [],
          storage: McpCustomStorage({
            loadCustomServers: vi.fn(async () => []),
            saveCustomServers,
            loadAuthState: vi.fn(async () => null),
            saveAuthState: vi.fn(async () => {}),
            clearAuthState: vi.fn(async () => {}),
          }),
          autoConnect: false,
        }),
      );
    });
    const root = createTapRoot(function Root() {
      return useResource(DynamicManager());
    });

    try {
      await vi.waitFor(() =>
        expect(root.getValue().getState().isHydrated).toBe(true),
      );
      await vi.waitFor(() => expect(saveCustomServers).toHaveBeenCalled());
      saveCustomServers.mockClear();

      rerender();

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(saveCustomServers).not.toHaveBeenCalled();
    } finally {
      root.unmount();
    }
  });
});
