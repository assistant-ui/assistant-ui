import { createTapRoot, resource, useResource } from "@assistant-ui/tap";
import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { defineConnector } from "../connector";
import type { MCPConnector, MCPCustomServerRecord } from "../mcp-scope";
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
    const saveCustomServers = vi.fn(async () => {});
    const root = mount(
      [],
      McpCustomStorage({
        loadCustomServers: vi.fn(async () => {
          throw error;
        }),
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
      expect(root.getValue().getState().customServers).toHaveLength(0);
      expect(saveCustomServers).not.toHaveBeenCalled();
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
      expect(saveCustomServers).not.toHaveBeenCalled();

      rerender();

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(saveCustomServers).not.toHaveBeenCalled();
    } finally {
      root.unmount();
    }
  });
});

describe("McpManagerResource storage switching", () => {
  it("rehydrates custom servers without persisting records from the previous storage", async () => {
    const docsServer = {
      id: "docs",
      name: "Docs",
      url: "https://example.com/docs/mcp",
      auth: { type: "none" as const },
      createdAt: 1,
    };
    const loadStorageA = vi.fn(async () => [docsServer]);
    const saveStorageA = vi.fn(async () => {});
    const loadStorageB = vi.fn(async () => []);
    const saveStorageB = vi.fn(async (_records: (typeof docsServer)[]) => {});
    const storageA = {
      loadCustomServers: loadStorageA,
      saveCustomServers: saveStorageA,
      loadAuthState: vi.fn(async () => null),
      saveAuthState: vi.fn(async () => {}),
      clearAuthState: vi.fn(async () => {}),
    };
    const storageB = {
      loadCustomServers: loadStorageB,
      saveCustomServers: saveStorageB,
      loadAuthState: vi.fn(async () => null),
      saveAuthState: vi.fn(async () => {}),
      clearAuthState: vi.fn(async () => {}),
    };
    let switchStorage = () => {};
    const DynamicManager = resource(function useDynamicManager() {
      const [storageKey, setStorageKey] = useState<"a" | "b">("a");
      switchStorage = () => setStorageKey("b");

      return useResource(
        McpManagerResource({
          connectors: [],
          storage: McpCustomStorage(storageKey === "a" ? storageA : storageB),
          storageScopeKey: storageKey,
          autoConnect: false,
        }),
      );
    });
    const root = createTapRoot(function Root() {
      return useResource(DynamicManager());
    });

    try {
      await vi.waitFor(() =>
        expect(root.getValue().getState().customServers).toHaveLength(1),
      );

      switchStorage();

      await vi.waitFor(() => expect(loadStorageB).toHaveBeenCalledOnce());
      await vi.waitFor(() => {
        expect(root.getValue().getState().isHydrated).toBe(true);
        expect(root.getValue().getState().customServers).toHaveLength(0);
      });
      expect(saveStorageB).not.toHaveBeenCalled();

      await root.getValue().addCustomServer({
        name: "Linear",
        url: "https://example.com/linear/mcp",
        auth: { type: "none" },
      });

      await vi.waitFor(() => expect(saveStorageB).toHaveBeenCalledOnce());
      expect(saveStorageB).toHaveBeenCalledWith([
        expect.objectContaining({ name: "Linear" }),
      ]);
    } finally {
      root.unmount();
    }
  });

  it("reconnects connectors with auth from the new storage scope", async () => {
    mocks.Client.mockClear();
    mocks.StreamableHTTPClientTransport.mockClear();
    const storageA = {
      loadCustomServers: vi.fn(async () => []),
      saveCustomServers: vi.fn(async () => {}),
      loadAuthState: vi.fn(async () => ({ token: "token-a" })),
      saveAuthState: vi.fn(async () => {}),
      clearAuthState: vi.fn(async () => {}),
    };
    const storageB = {
      loadCustomServers: vi.fn(async () => []),
      saveCustomServers: vi.fn(async () => {}),
      loadAuthState: vi.fn(async () => ({ token: "token-b" })),
      saveAuthState: vi.fn(async () => {}),
      clearAuthState: vi.fn(async () => {}),
    };
    let switchStorage = () => {};
    const DynamicManager = resource(function useDynamicManager() {
      const [storageKey, setStorageKey] = useState<"a" | "b">("a");
      switchStorage = () => setStorageKey("b");

      return useResource(
        McpManagerResource({
          connectors: [
            defineConnector({
              id: "docs",
              name: "Docs",
              url: "https://example.com/docs/mcp",
              auth: { type: "bearer" },
            }),
          ],
          storage: McpCustomStorage(storageKey === "a" ? storageA : storageB),
          storageScopeKey: storageKey,
        }),
      );
    });
    const root = createTapRoot(function Root() {
      return useResource(DynamicManager());
    });

    try {
      await vi.waitFor(() =>
        expect(
          root.getValue().connector({ index: 0 }).getState().connectionState,
        ).toBe("connected"),
      );
      const firstTransport =
        mocks.StreamableHTTPClientTransport.mock.results[0]?.value;

      switchStorage();

      await vi.waitFor(() =>
        expect(storageB.loadAuthState).toHaveBeenCalledWith("docs"),
      );
      await vi.waitFor(() =>
        expect(firstTransport.close).toHaveBeenCalledOnce(),
      );
      await vi.waitFor(() =>
        expect(mocks.StreamableHTTPClientTransport).toHaveBeenCalledTimes(2),
      );
      await vi.waitFor(() =>
        expect(
          root.getValue().connector({ index: 0 }).getState().connectionState,
        ).toBe("connected"),
      );
      expect(
        mocks.StreamableHTTPClientTransport.mock.calls[1]?.[1],
      ).toMatchObject({
        requestInit: {
          headers: { Authorization: "Bearer token-b" },
        },
      });
    } finally {
      root.unmount();
    }
  });

  it("persists a new storage scope without waiting for the previous scope", async () => {
    let resolveStorageASave: (() => void) | undefined;
    const pendingStorageASave = new Promise<void>((resolve) => {
      resolveStorageASave = resolve;
    });
    let blockStorageASave = false;
    const storageA = {
      loadCustomServers: vi.fn(async () => []),
      saveCustomServers: vi.fn(async () => {
        if (blockStorageASave) await pendingStorageASave;
      }),
      loadAuthState: vi.fn(async () => null),
      saveAuthState: vi.fn(async () => {}),
      clearAuthState: vi.fn(async () => {}),
    };
    const storageB = {
      loadCustomServers: vi.fn(async () => []),
      saveCustomServers: vi.fn(async () => {}),
      loadAuthState: vi.fn(async () => null),
      saveAuthState: vi.fn(async () => {}),
      clearAuthState: vi.fn(async () => {}),
    };
    let switchStorage = () => {};
    const DynamicManager = resource(function useDynamicManager() {
      const [storageKey, setStorageKey] = useState<"a" | "b">("a");
      switchStorage = () => setStorageKey("b");

      return useResource(
        McpManagerResource({
          connectors: [],
          storage: McpCustomStorage(storageKey === "a" ? storageA : storageB),
          storageScopeKey: storageKey,
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
      blockStorageASave = true;

      await root.getValue().addCustomServer({
        name: "Docs",
        url: "https://example.com/docs/mcp",
        auth: { type: "none" },
      });
      await vi.waitFor(() =>
        expect(storageA.saveCustomServers).toHaveBeenCalledOnce(),
      );

      switchStorage();

      await vi.waitFor(() =>
        expect(storageB.loadCustomServers).toHaveBeenCalledOnce(),
      );
      await vi.waitFor(() =>
        expect(root.getValue().getState().isHydrated).toBe(true),
      );
      await root.getValue().addCustomServer({
        name: "Linear",
        url: "https://example.com/linear/mcp",
        auth: { type: "none" },
      });

      await vi.waitFor(() =>
        expect(storageB.saveCustomServers).toHaveBeenCalledWith([
          expect.objectContaining({ name: "Linear" }),
        ]),
      );
      expect(storageA.saveCustomServers).toHaveBeenCalledOnce();
    } finally {
      resolveStorageASave?.();
      root.unmount();
    }
  });

  it("waits for pending persistence before rehydrating a storage scope", async () => {
    let resolveFirstStorageASave: (() => void) | undefined;
    const firstStorageASave = new Promise<void>((resolve) => {
      resolveFirstStorageASave = resolve;
    });
    let persistedStorageARecords: MCPCustomServerRecord[] = [];
    let blockStorageASave = false;
    const storageA = {
      loadCustomServers: vi.fn(async () => [...persistedStorageARecords]),
      saveCustomServers: vi.fn(async (records: MCPCustomServerRecord[]) => {
        if (blockStorageASave) {
          blockStorageASave = false;
          await firstStorageASave;
        }
        persistedStorageARecords = records;
      }),
      loadAuthState: vi.fn(async () => null),
      saveAuthState: vi.fn(async () => {}),
      clearAuthState: vi.fn(async () => {}),
    };
    const storageB = {
      loadCustomServers: vi.fn(async () => []),
      saveCustomServers: vi.fn(async () => {}),
      loadAuthState: vi.fn(async () => null),
      saveAuthState: vi.fn(async () => {}),
      clearAuthState: vi.fn(async () => {}),
    };
    let setStorage = (_storageKey: "a" | "b") => {};
    const DynamicManager = resource(function useDynamicManager() {
      const [storageKey, setStorageKey] = useState<"a" | "b">("a");
      setStorage = setStorageKey;

      return useResource(
        McpManagerResource({
          connectors: [],
          storage: McpCustomStorage(storageKey === "a" ? storageA : storageB),
          storageScopeKey: storageKey,
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
      blockStorageASave = true;

      await root.getValue().addCustomServer({
        name: "Stale",
        url: "https://example.com/stale/mcp",
        auth: { type: "none" },
      });
      await vi.waitFor(() =>
        expect(storageA.saveCustomServers).toHaveBeenCalledOnce(),
      );

      setStorage("b");
      await vi.waitFor(() =>
        expect(storageB.loadCustomServers).toHaveBeenCalledOnce(),
      );
      const storageALoadCount = storageA.loadCustomServers.mock.calls.length;
      setStorage("a");

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(storageA.loadCustomServers).toHaveBeenCalledTimes(
        storageALoadCount,
      );
      resolveFirstStorageASave?.();
      await vi.waitFor(() =>
        expect(storageA.loadCustomServers.mock.calls.length).toBeGreaterThan(
          storageALoadCount,
        ),
      );
      await vi.waitFor(() =>
        expect(root.getValue().getState().customServers[0]?.name).toBe("Stale"),
      );
      expect(storageA.saveCustomServers).toHaveBeenCalledOnce();

      await root.getValue().addCustomServer({
        name: "Latest",
        url: "https://example.com/latest/mcp",
        auth: { type: "none" },
      });

      await vi.waitFor(() =>
        expect(persistedStorageARecords.map((record) => record.name)).toEqual([
          "Stale",
          "Latest",
        ]),
      );
      expect(storageA.saveCustomServers).toHaveBeenCalledTimes(2);
    } finally {
      resolveFirstStorageASave?.();
      root.unmount();
    }
  });

  it("ignores a previous storage load that resolves after switching", async () => {
    const docsServer = {
      id: "docs",
      name: "Docs",
      url: "https://example.com/docs/mcp",
      auth: { type: "none" as const },
      createdAt: 1,
    };
    let resolveStorageA: ((records: (typeof docsServer)[]) => void) | undefined;
    const storageALoad = new Promise<(typeof docsServer)[]>((resolve) => {
      resolveStorageA = resolve;
    });
    const storageA = {
      loadCustomServers: vi.fn(() => storageALoad),
      saveCustomServers: vi.fn(async () => {}),
      loadAuthState: vi.fn(async () => null),
      saveAuthState: vi.fn(async () => {}),
      clearAuthState: vi.fn(async () => {}),
    };
    const storageB = {
      loadCustomServers: vi.fn(async () => []),
      saveCustomServers: vi.fn(async () => {}),
      loadAuthState: vi.fn(async () => null),
      saveAuthState: vi.fn(async () => {}),
      clearAuthState: vi.fn(async () => {}),
    };
    let switchStorage = () => {};
    const DynamicManager = resource(function useDynamicManager() {
      const [storageKey, setStorageKey] = useState<"a" | "b">("a");
      switchStorage = () => setStorageKey("b");

      return useResource(
        McpManagerResource({
          connectors: [],
          storage: McpCustomStorage(storageKey === "a" ? storageA : storageB),
          storageScopeKey: storageKey,
          autoConnect: false,
        }),
      );
    });
    const root = createTapRoot(function Root() {
      return useResource(DynamicManager());
    });

    try {
      await vi.waitFor(() =>
        expect(storageA.loadCustomServers).toHaveBeenCalled(),
      );

      switchStorage();

      await vi.waitFor(() =>
        expect(storageB.loadCustomServers).toHaveBeenCalledOnce(),
      );
      resolveStorageA?.([docsServer]);
      await vi.waitFor(() =>
        expect(root.getValue().getState().isHydrated).toBe(true),
      );
      expect(root.getValue().getState().customServers).toHaveLength(0);
    } finally {
      resolveStorageA?.([]);
      root.unmount();
    }
  });

  it("ignores a removal that finishes after switching storage", async () => {
    const docsServer = {
      id: "docs",
      name: "Docs",
      url: "https://example.com/docs/mcp",
      auth: { type: "none" as const },
      createdAt: 1,
    };
    const workspaceBDocsServer = {
      id: "docs",
      name: "Workspace B Docs",
      url: "https://example.com/workspace-b/docs/mcp",
      auth: { type: "none" as const },
      createdAt: 2,
    };
    let resolveStorageAClear: (() => void) | undefined;
    const storageAClear = new Promise<void>((resolve) => {
      resolveStorageAClear = resolve;
    });
    const storageA = {
      loadCustomServers: vi.fn(async () => [docsServer]),
      saveCustomServers: vi.fn(async () => {}),
      loadAuthState: vi.fn(async () => null),
      saveAuthState: vi.fn(async () => {}),
      clearAuthState: vi.fn(() => storageAClear),
    };
    const storageB = {
      loadCustomServers: vi.fn(async () => [workspaceBDocsServer]),
      saveCustomServers: vi.fn(async () => {}),
      loadAuthState: vi.fn(async () => null),
      saveAuthState: vi.fn(async () => {}),
      clearAuthState: vi.fn(async () => {}),
    };
    let switchStorage = () => {};
    const DynamicManager = resource(function useDynamicManager() {
      const [storageKey, setStorageKey] = useState<"a" | "b">("a");
      switchStorage = () => setStorageKey("b");

      return useResource(
        McpManagerResource({
          connectors: [],
          storage: McpCustomStorage(storageKey === "a" ? storageA : storageB),
          storageScopeKey: storageKey,
          autoConnect: false,
        }),
      );
    });
    const root = createTapRoot(function Root() {
      return useResource(DynamicManager());
    });

    try {
      await vi.waitFor(() =>
        expect(root.getValue().getState().customServers[0]?.id).toBe("docs"),
      );
      const removal = root.getValue().removeServer("docs");
      await vi.waitFor(() =>
        expect(storageA.clearAuthState).toHaveBeenCalledWith("docs"),
      );

      switchStorage();

      await vi.waitFor(() => {
        expect(root.getValue().getState().isHydrated).toBe(true);
        expect(root.getValue().getState().customServers[0]?.name).toBe(
          "Workspace B Docs",
        );
      });
      resolveStorageAClear?.();
      await removal;

      expect(root.getValue().getState().isHydrated).toBe(true);
      expect(root.getValue().getState().customServers).toEqual([
        expect.objectContaining({
          id: "docs",
          name: "Workspace B Docs",
        }),
      ]);
    } finally {
      resolveStorageAClear?.();
      root.unmount();
    }
  });
});
