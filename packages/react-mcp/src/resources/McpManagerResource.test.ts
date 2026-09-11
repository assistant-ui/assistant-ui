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

  it("replaces a connected transport when connector settings change", async () => {
    mocks.StreamableHTTPClientTransport.mockClear();
    let updateConnector = (_connector: MCPConnector) => {};
    const DynamicManager = resource(function useDynamicManager() {
      const [currentConnector, setCurrentConnector] = useState(
        connector("docs"),
      );
      updateConnector = setCurrentConnector;

      return useResource(
        McpManagerResource({
          connectors: [currentConnector],
          storage: McpMemoryStorage(),
        }),
      );
    });
    const root = createTapRoot(function Root() {
      return useResource(DynamicManager());
    });
    let resolveFirstClose = () => {};

    try {
      await vi.waitFor(() =>
        expect(mocks.StreamableHTTPClientTransport).toHaveBeenCalledOnce(),
      );
      const firstTransport = mocks.StreamableHTTPClientTransport.mock
        .instances[0] as { close: ReturnType<typeof vi.fn> };
      firstTransport.close.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveFirstClose = resolve;
          }),
      );

      updateConnector(
        defineConnector({
          id: "docs",
          name: "Docs",
          url: "https://other.example.com/docs/mcp",
          auth: { type: "none" },
        }),
      );

      await vi.waitFor(() =>
        expect(firstTransport.close).toHaveBeenCalledOnce(),
      );
      expect(mocks.StreamableHTTPClientTransport).toHaveBeenCalledOnce();

      resolveFirstClose();
      await vi.waitFor(() =>
        expect(mocks.StreamableHTTPClientTransport).toHaveBeenCalledTimes(2),
      );

      expect(mocks.StreamableHTTPClientTransport).toHaveBeenLastCalledWith(
        new URL("https://other.example.com/docs/mcp"),
      );
    } finally {
      resolveFirstClose();
      root.unmount();
    }
  });

  it("keeps a connection across equivalent and cosmetic connector updates", async () => {
    mocks.StreamableHTTPClientTransport.mockClear();
    let rerenderEquivalent = () => {};
    let updatePresentation = () => {};
    const DynamicManager = resource(function useDynamicManager() {
      const [, setVersion] = useState(0);
      const [presentation, setPresentation] = useState({
        name: "Docs",
        icon: "docs.svg",
      });
      rerenderEquivalent = () => setVersion((version) => version + 1);
      updatePresentation = () =>
        setPresentation({ name: "Documentation", icon: "book.svg" });

      return useResource(
        McpManagerResource({
          connectors: [
            defineConnector({
              id: "docs",
              name: presentation.name,
              icon: presentation.icon,
              url: "https://example.com/docs/mcp",
              auth: { type: "none" },
            }),
          ],
          storage: McpCustomStorage({
            loadCustomServers: vi.fn(async () => []),
            saveCustomServers: vi.fn(async () => {}),
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
      await root.getValue().connector({ index: 0 }).connect();
      const transport = mocks.StreamableHTTPClientTransport.mock
        .instances[0] as { close: ReturnType<typeof vi.fn> };

      rerenderEquivalent();
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(mocks.StreamableHTTPClientTransport).toHaveBeenCalledOnce();
      expect(transport.close).not.toHaveBeenCalled();

      updatePresentation();
      await vi.waitFor(() =>
        expect(
          root.getValue().connector({ index: 0 }).getState(),
        ).toMatchObject({
          name: "Documentation",
          icon: "book.svg",
        }),
      );
      expect(mocks.StreamableHTTPClientTransport).toHaveBeenCalledOnce();
      expect(transport.close).not.toHaveBeenCalled();
    } finally {
      root.unmount();
    }
  });
});

describe("McpManagerResource storage failures", () => {
  it("keeps persistence fenced after custom server load failures", async () => {
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
      expect(consoleError).toHaveBeenCalledWith(
        "[assistant-ui/react-mcp] failed to load custom servers:",
        error,
      );

      await root.getValue().addCustomServer({
        name: "Docs",
        url: "https://example.com/docs/mcp",
        auth: { type: "none" },
      });
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(root.getValue().getState().customServers).toHaveLength(1);
      expect(saveCustomServers).not.toHaveBeenCalled();
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
      expect(saveCustomServers).not.toHaveBeenCalled();
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
      expect(saveCustomServers).not.toHaveBeenCalled();
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
  const docsServer = {
    id: "docs",
    name: "Docs",
    url: "https://example.com/docs/mcp",
    auth: { type: "none" as const },
    createdAt: 1,
  };

  it("rehydrates custom servers without copying records from the previous scope", async () => {
    let resolveStorageB:
      | ((records: MCPCustomServerRecord[]) => void)
      | undefined;
    const storageBLoad = new Promise<MCPCustomServerRecord[]>((resolve) => {
      resolveStorageB = resolve;
    });
    const saveStorageB = vi.fn(async (_records: MCPCustomServerRecord[]) => {});
    const storageA = {
      scopeId: "account:a",
      loadCustomServers: vi.fn(async () => [docsServer]),
      saveCustomServers: vi.fn(async () => {}),
      loadAuthState: vi.fn(async () => null),
      saveAuthState: vi.fn(async () => {}),
      clearAuthState: vi.fn(async () => {}),
    };
    const storageB = {
      scopeId: "account:b",
      loadCustomServers: vi.fn(() => storageBLoad),
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
          storage: McpCustomStorage(storageKey === "a" ? storageA : storageB),
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
      expect(storageA.saveCustomServers).not.toHaveBeenCalled();

      switchStorage();

      await vi.waitFor(() =>
        expect(storageB.loadCustomServers).toHaveBeenCalled(),
      );
      expect(root.getValue().getState()).toMatchObject({
        isHydrated: false,
        customServers: [],
      });

      resolveStorageB?.([]);
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
      resolveStorageB?.([]);
      root.unmount();
    }
  });

  it("keeps custom servers when the storage object retains its scope", async () => {
    const storageA = {
      scopeId: "account:a",
      loadCustomServers: vi.fn(async () => [docsServer]),
      saveCustomServers: vi.fn(async () => {}),
      loadAuthState: vi.fn(async () => null),
      saveAuthState: vi.fn(async () => {}),
      clearAuthState: vi.fn(async () => {}),
    };
    const storageAReplacement = {
      scopeId: "account:a",
      loadCustomServers: vi.fn(async () => []),
      saveCustomServers: vi.fn(async () => {}),
      loadAuthState: vi.fn(async () => null),
      saveAuthState: vi.fn(async () => {}),
      clearAuthState: vi.fn(async () => {}),
    };
    let replaceStorage = () => {};
    const DynamicManager = resource(function useDynamicManager() {
      const [replacement, setReplacement] = useState(false);
      replaceStorage = () => setReplacement(true);
      return useResource(
        McpManagerResource({
          storage: McpCustomStorage(
            replacement ? storageAReplacement : storageA,
          ),
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

      replaceStorage();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(storageAReplacement.loadCustomServers).not.toHaveBeenCalled();
      expect(root.getValue().getState().customServers[0]?.id).toBe("docs");
    } finally {
      root.unmount();
    }
  });

  it("keeps persistence independent across storage scopes", async () => {
    let resolveStorageASave: (() => void) | undefined;
    const pendingStorageASave = new Promise<void>((resolve) => {
      resolveStorageASave = resolve;
    });
    let blockStorageASave = false;
    const storageA = {
      scopeId: "account:a",
      loadCustomServers: vi.fn(async () => []),
      saveCustomServers: vi.fn(async () => {
        if (blockStorageASave) await pendingStorageASave;
      }),
      loadAuthState: vi.fn(async () => null),
      saveAuthState: vi.fn(async () => {}),
      clearAuthState: vi.fn(async () => {}),
    };
    const storageB = {
      scopeId: "account:b",
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
          storage: McpCustomStorage(storageKey === "a" ? storageA : storageB),
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
      expect(storageA.saveCustomServers).not.toHaveBeenCalled();
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
        expect(storageB.loadCustomServers).toHaveBeenCalled(),
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

  it("waits for pending persistence before revisiting a scope", async () => {
    let resolveStorageASave: (() => void) | undefined;
    const pendingStorageASave = new Promise<void>((resolve) => {
      resolveStorageASave = resolve;
    });
    let persistedStorageARecords: MCPCustomServerRecord[] = [];
    let blockStorageASave = false;
    const storageA = {
      scopeId: "account:a",
      loadCustomServers: vi.fn(async () => [...persistedStorageARecords]),
      saveCustomServers: vi.fn(async (records: MCPCustomServerRecord[]) => {
        if (blockStorageASave) {
          blockStorageASave = false;
          await pendingStorageASave;
        }
        persistedStorageARecords = records;
      }),
      loadAuthState: vi.fn(async () => null),
      saveAuthState: vi.fn(async () => {}),
      clearAuthState: vi.fn(async () => {}),
    };
    const storageB = {
      scopeId: "account:b",
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
          storage: McpCustomStorage(storageKey === "a" ? storageA : storageB),
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
      expect(storageA.saveCustomServers).not.toHaveBeenCalled();
      blockStorageASave = true;

      await root.getValue().addCustomServer({
        name: "Docs",
        url: "https://example.com/docs/mcp",
        auth: { type: "none" },
      });
      await vi.waitFor(() =>
        expect(storageA.saveCustomServers).toHaveBeenCalledOnce(),
      );

      setStorage("b");
      await vi.waitFor(() =>
        expect(storageB.loadCustomServers).toHaveBeenCalled(),
      );
      const storageALoadCount = storageA.loadCustomServers.mock.calls.length;

      setStorage("a");
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(storageA.loadCustomServers).toHaveBeenCalledTimes(
        storageALoadCount,
      );

      resolveStorageASave?.();
      await vi.waitFor(() =>
        expect(storageA.loadCustomServers.mock.calls.length).toBeGreaterThan(
          storageALoadCount,
        ),
      );
      await vi.waitFor(() =>
        expect(root.getValue().getState().customServers[0]?.name).toBe("Docs"),
      );
    } finally {
      resolveStorageASave?.();
      root.unmount();
    }
  });

  it("ignores hydration that resolves after changing scopes", async () => {
    let resolveStorageA: ((records: (typeof docsServer)[]) => void) | undefined;
    const storageALoad = new Promise<(typeof docsServer)[]>((resolve) => {
      resolveStorageA = resolve;
    });
    const storageA = {
      scopeId: "account:a",
      loadCustomServers: vi.fn(() => storageALoad),
      saveCustomServers: vi.fn(async () => {}),
      loadAuthState: vi.fn(async () => null),
      saveAuthState: vi.fn(async () => {}),
      clearAuthState: vi.fn(async () => {}),
    };
    const storageB = {
      scopeId: "account:b",
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
          storage: McpCustomStorage(storageKey === "a" ? storageA : storageB),
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
        expect(storageB.loadCustomServers).toHaveBeenCalled(),
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

  it("does not let a delayed removal affect the replacement scope", async () => {
    const workspaceBDocsServer = {
      ...docsServer,
      name: "Workspace B Docs",
      url: "https://example.com/workspace-b/docs/mcp",
      createdAt: 2,
    };
    let resolveStorageAClear: (() => void) | undefined;
    const storageAClear = new Promise<void>((resolve) => {
      resolveStorageAClear = resolve;
    });
    const storageA = {
      scopeId: "account:a",
      loadCustomServers: vi.fn(async () => [docsServer]),
      saveCustomServers: vi.fn(async () => {}),
      loadAuthState: vi.fn(async () => null),
      saveAuthState: vi.fn(async () => {}),
      clearAuthState: vi.fn(() => storageAClear),
    };
    const storageB = {
      scopeId: "account:b",
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
          storage: McpCustomStorage(storageKey === "a" ? storageA : storageB),
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

      await vi.waitFor(() =>
        expect(root.getValue().getState().customServers[0]?.name).toBe(
          "Workspace B Docs",
        ),
      );
      resolveStorageAClear?.();
      await removal;

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

  it("disposes a no-auth custom server from the previous scope", async () => {
    mocks.StreamableHTTPClientTransport.mockClear();
    const storageA = {
      scopeId: "account:a",
      loadCustomServers: vi.fn(async () => [docsServer]),
      saveCustomServers: vi.fn(async () => {}),
      loadAuthState: vi.fn(async () => null),
      saveAuthState: vi.fn(async () => {}),
      clearAuthState: vi.fn(async () => {}),
    };
    const storageB = {
      scopeId: "account:b",
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
          storage: McpCustomStorage(storageKey === "a" ? storageA : storageB),
        }),
      );
    });
    const root = createTapRoot(function Root() {
      return useResource(DynamicManager());
    });

    try {
      await vi.waitFor(() =>
        expect(
          root.getValue().customServer({ index: 0 }).getState().connectionState,
        ).toBe("connected"),
      );
      const firstTransport = mocks.StreamableHTTPClientTransport.mock
        .instances[0] as { close: ReturnType<typeof vi.fn> };

      switchStorage();

      await vi.waitFor(() =>
        expect(storageB.loadCustomServers).toHaveBeenCalled(),
      );
      await vi.waitFor(() => expect(firstTransport.close).toHaveBeenCalled());
      expect(root.getValue().getState().customServers).toHaveLength(0);
    } finally {
      root.unmount();
    }
  });
});
