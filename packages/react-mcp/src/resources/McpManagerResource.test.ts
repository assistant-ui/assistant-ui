import { createTapRoot, resource, useResource } from "@assistant-ui/tap";
import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { defineConnector } from "../connector";
import type { MCPConnector } from "../mcp-scope";
import { assertUniqueServerIds } from "../utils/serverId";
import { McpManagerResource } from "./McpManagerResource";
import { McpCustomStorage } from "./storage/McpCustomStorage";
import { McpMemoryStorage } from "./storage/McpMemoryStorage";
import type { MCPCustomServerRecord } from "../mcp-scope";
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

const mountStorageSwitcher = (
  initialStorage: MCPStorageElement,
  autoConnect = false,
) => {
  let setStorage!: (storage: MCPStorageElement) => void;
  const DynamicManager = resource(function useDynamicManager() {
    const [storage, set] = useState<MCPStorageElement>(initialStorage);
    setStorage = set;
    return useResource(
      McpManagerResource({
        connectors: [],
        storage,
        autoConnect,
      }),
    );
  });
  const root = createTapRoot(function Root() {
    return useResource(DynamicManager());
  });
  return {
    root,
    setStorage: (storage: MCPStorageElement) => setStorage(storage),
  };
};

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
  it("rehydrates custom servers after a storage scope switch", async () => {
    const docs = {
      id: "docs",
      name: "Docs",
      url: "https://example.com/docs/mcp",
      auth: { type: "none" as const },
      createdAt: 1,
    };
    const loadA = vi.fn(async () => [docs]);
    const loadB = vi.fn(async () => []);
    const saveB = vi.fn(async (_records: MCPCustomServerRecord[]) => {});
    const storageA = McpCustomStorage({
      scopeId: "account:a",
      loadCustomServers: loadA,
      saveCustomServers: vi.fn(async () => {}),
      loadAuthState: vi.fn(async () => null),
      saveAuthState: vi.fn(async () => {}),
      clearAuthState: vi.fn(async () => {}),
    });
    const storageB = McpCustomStorage({
      scopeId: "account:b",
      loadCustomServers: loadB,
      saveCustomServers: saveB,
      loadAuthState: vi.fn(async () => null),
      saveAuthState: vi.fn(async () => {}),
      clearAuthState: vi.fn(async () => {}),
    });
    let setStorage!: (storage: MCPStorageElement) => void;
    const DynamicManager = resource(function useDynamicManager() {
      const [storage, set] = useState<MCPStorageElement>(storageA);
      setStorage = set;
      return useResource(
        McpManagerResource({
          connectors: [],
          storage,
          autoConnect: false,
        }),
      );
    });
    const root = createTapRoot(function Root() {
      return useResource(DynamicManager());
    });

    try {
      await vi.waitFor(() =>
        expect(root.getValue().getState().customServers).toMatchObject([
          { id: docs.id, name: docs.name },
        ]),
      );
      setStorage(storageB);
      await vi.waitFor(() => expect(loadB).toHaveBeenCalled());
      await vi.waitFor(() =>
        expect(root.getValue().getState().customServers).toHaveLength(0),
      );
      expect(root.getValue().getState().isHydrated).toBe(true);

      await root.getValue().addCustomServer({
        name: "Linear",
        url: "https://example.com/linear/mcp",
        auth: { type: "none" },
      });
      await vi.waitFor(() =>
        expect(
          saveB.mock.calls.some(([records]) =>
            records.some((record) => record.name === "Linear"),
          ),
        ).toBe(true),
      );
      expect(
        saveB.mock.calls.every(([records]) =>
          records.every((record) => record.id !== docs.id),
        ),
      ).toBe(true);
    } finally {
      root.unmount();
    }
  });

  it("ignores a late load from the previous storage scope", async () => {
    const docs = {
      id: "docs",
      name: "Docs",
      url: "https://example.com/docs/mcp",
      auth: { type: "none" as const },
      createdAt: 1,
    };
    let resolveA!: (records: (typeof docs)[]) => void;
    let resolveB!: (records: (typeof docs)[]) => void;
    const loadA = vi.fn(
      () => new Promise<(typeof docs)[]>((resolve) => (resolveA = resolve)),
    );
    const loadB = vi.fn(
      () => new Promise<(typeof docs)[]>((resolve) => (resolveB = resolve)),
    );
    const storageA = McpCustomStorage({
      scopeId: "account:a",
      loadCustomServers: loadA,
      saveCustomServers: vi.fn(async () => {}),
      loadAuthState: vi.fn(async () => null),
      saveAuthState: vi.fn(async () => {}),
      clearAuthState: vi.fn(async () => {}),
    });
    const storageB = McpCustomStorage({
      scopeId: "account:b",
      loadCustomServers: loadB,
      saveCustomServers: vi.fn(async () => {}),
      loadAuthState: vi.fn(async () => null),
      saveAuthState: vi.fn(async () => {}),
      clearAuthState: vi.fn(async () => {}),
    });
    const { root, setStorage } = mountStorageSwitcher(storageA);

    try {
      await vi.waitFor(() => expect(loadA).toHaveBeenCalled());
      setStorage(storageB);
      await vi.waitFor(() => expect(loadB).toHaveBeenCalled());
      expect(root.getValue().getState().customServers).toHaveLength(0);
      expect(root.getValue().getState().isHydrated).toBe(false);
      resolveB([]);
      await vi.waitFor(() =>
        expect(root.getValue().getState().isHydrated).toBe(true),
      );
      expect(root.getValue().getState().customServers).toHaveLength(0);

      resolveA([docs]);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(root.getValue().getState().customServers).toHaveLength(0);
    } finally {
      root.unmount();
    }
  });

  it("disposes custom resources from the previous scope", async () => {
    mocks.StreamableHTTPClientTransport.mockClear();
    const docs = {
      id: "docs",
      name: "Docs",
      url: "https://example.com/docs/mcp",
      auth: { type: "none" as const },
      createdAt: 1,
    };
    const storageA = McpCustomStorage({
      scopeId: "account:a",
      loadCustomServers: vi.fn(async () => [docs]),
      saveCustomServers: vi.fn(async () => {}),
      loadAuthState: vi.fn(async () => null),
      saveAuthState: vi.fn(async () => {}),
      clearAuthState: vi.fn(async () => {}),
    });
    const storageB = McpCustomStorage({
      scopeId: "account:b",
      loadCustomServers: vi.fn(async () => []),
      saveCustomServers: vi.fn(async () => {}),
      loadAuthState: vi.fn(async () => null),
      saveAuthState: vi.fn(async () => {}),
      clearAuthState: vi.fn(async () => {}),
    });
    const { root, setStorage } = mountStorageSwitcher(storageA, true);

    try {
      await vi.waitFor(() =>
        expect(mocks.StreamableHTTPClientTransport).toHaveBeenCalledOnce(),
      );
      const transport = mocks.StreamableHTTPClientTransport.mock
        .instances[0] as { close: ReturnType<typeof vi.fn> };

      setStorage(storageB);
      await vi.waitFor(() => expect(transport.close).toHaveBeenCalled());
      await vi.waitFor(() =>
        expect(root.getValue().getState().customServers).toHaveLength(0),
      );
    } finally {
      root.unmount();
    }
  });

  it("keeps persistence queues independent and hydrates after target writes", async () => {
    const persistedB: MCPCustomServerRecord[] = [];
    let resolveBWrite!: () => void;
    const blockedBWrite = new Promise<void>((resolve) => {
      resolveBWrite = resolve;
    });
    const loadA = vi.fn(async () => []);
    const loadB = vi.fn(async () => [...persistedB]);
    const saveB = vi.fn(async (records: MCPCustomServerRecord[]) => {
      if (records.some((record) => record.name === "B")) {
        await blockedBWrite;
      }
      persistedB.splice(0, persistedB.length, ...records);
    });
    const storageB = McpCustomStorage({
      scopeId: "account:b",
      loadCustomServers: loadB,
      saveCustomServers: saveB,
      loadAuthState: vi.fn(async () => null),
      saveAuthState: vi.fn(async () => {}),
      clearAuthState: vi.fn(async () => {}),
    });
    const storageA = McpCustomStorage({
      scopeId: "account:a",
      loadCustomServers: loadA,
      saveCustomServers: vi.fn(async () => {}),
      loadAuthState: vi.fn(async () => null),
      saveAuthState: vi.fn(async () => {}),
      clearAuthState: vi.fn(async () => {}),
    });
    const { root, setStorage } = mountStorageSwitcher(storageB);

    try {
      await vi.waitFor(() =>
        expect(root.getValue().getState().isHydrated).toBe(true),
      );
      const initialLoadCount = loadB.mock.calls.length;
      await root.getValue().addCustomServer({
        name: "B",
        url: "https://example.com/b/mcp",
        auth: { type: "none" },
      });
      await vi.waitFor(() =>
        expect(
          saveB.mock.calls.some(([records]) =>
            records.some((record) => record.name === "B"),
          ),
        ).toBe(true),
      );

      setStorage(storageA);
      await vi.waitFor(() => expect(loadA).toHaveBeenCalled());
      setStorage(storageB);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(loadB).toHaveBeenCalledTimes(initialLoadCount);

      resolveBWrite();
      await vi.waitFor(() =>
        expect(loadB).toHaveBeenCalledTimes(initialLoadCount + 1),
      );
      await vi.waitFor(() =>
        expect(root.getValue().getState().customServers).toMatchObject([
          { name: "B" },
        ]),
      );
    } finally {
      resolveBWrite();
      root.unmount();
    }
  });

  it("preserves state for same-scope storage replacements", async () => {
    const docs = {
      id: "docs",
      name: "Docs",
      url: "https://example.com/docs/mcp",
      auth: { type: "none" as const },
      createdAt: 1,
    };
    const loadA = vi.fn(async () => [docs]);
    const loadB = vi.fn(async () => []);
    const storageA = McpCustomStorage({
      scopeId: "account:same",
      loadCustomServers: loadA,
      saveCustomServers: vi.fn(async () => {}),
      loadAuthState: vi.fn(async () => null),
      saveAuthState: vi.fn(async () => {}),
      clearAuthState: vi.fn(async () => {}),
    });
    const storageB = McpCustomStorage({
      scopeId: "account:same",
      loadCustomServers: loadB,
      saveCustomServers: vi.fn(async () => {}),
      loadAuthState: vi.fn(async () => null),
      saveAuthState: vi.fn(async () => {}),
      clearAuthState: vi.fn(async () => {}),
    });
    const { root, setStorage } = mountStorageSwitcher(storageA);

    try {
      await vi.waitFor(() =>
        expect(root.getValue().getState().customServers).toMatchObject([
          { id: docs.id },
        ]),
      );
      setStorage(storageB);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(loadB).not.toHaveBeenCalled();
      expect(root.getValue().getState().customServers).toMatchObject([
        { id: docs.id },
      ]);
    } finally {
      root.unmount();
    }
  });

  it("preserves legacy behavior for unscoped storage replacements", async () => {
    const docs = {
      id: "docs",
      name: "Docs",
      url: "https://example.com/docs/mcp",
      auth: { type: "none" as const },
      createdAt: 1,
    };
    const loadA = vi.fn(async () => [docs]);
    const loadB = vi.fn(async () => []);
    const storageA = McpCustomStorage({
      loadCustomServers: loadA,
      saveCustomServers: vi.fn(async () => {}),
      loadAuthState: vi.fn(async () => null),
      saveAuthState: vi.fn(async () => {}),
      clearAuthState: vi.fn(async () => {}),
    });
    const storageB = McpCustomStorage({
      loadCustomServers: loadB,
      saveCustomServers: vi.fn(async () => {}),
      loadAuthState: vi.fn(async () => null),
      saveAuthState: vi.fn(async () => {}),
      clearAuthState: vi.fn(async () => {}),
    });
    const { root, setStorage } = mountStorageSwitcher(storageA);

    try {
      await vi.waitFor(() =>
        expect(root.getValue().getState().customServers).toMatchObject([
          { id: docs.id },
        ]),
      );
      setStorage(storageB);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(loadB).not.toHaveBeenCalled();
      expect(root.getValue().getState().customServers).toMatchObject([
        { id: docs.id },
      ]);
    } finally {
      root.unmount();
    }
  });

  it("ignores removal callbacks from the previous scope", async () => {
    const docsA = {
      id: "docs",
      name: "Docs A",
      url: "https://example.com/docs-a/mcp",
      auth: { type: "none" as const },
      createdAt: 1,
    };
    const docsB = {
      ...docsA,
      name: "Docs B",
      url: "https://example.com/docs-b/mcp",
    };
    const storageA = McpCustomStorage({
      scopeId: "account:a",
      loadCustomServers: vi.fn(async () => [docsA]),
      saveCustomServers: vi.fn(async () => {}),
      loadAuthState: vi.fn(async () => null),
      saveAuthState: vi.fn(async () => {}),
      clearAuthState: vi.fn(async () => {}),
    });
    const storageB = McpCustomStorage({
      scopeId: "account:b",
      loadCustomServers: vi.fn(async () => [docsB]),
      saveCustomServers: vi.fn(async () => {}),
      loadAuthState: vi.fn(async () => null),
      saveAuthState: vi.fn(async () => {}),
      clearAuthState: vi.fn(async () => {}),
    });
    const { root, setStorage } = mountStorageSwitcher(storageA);

    try {
      await vi.waitFor(() =>
        expect(root.getValue().getState().customServers).toMatchObject([
          { name: docsA.name },
        ]),
      );
      const staleServer = root.getValue().server({ id: docsA.id });
      setStorage(storageB);
      await vi.waitFor(() =>
        expect(root.getValue().getState().customServers).toMatchObject([
          { name: docsB.name },
        ]),
      );

      await staleServer.remove();
      expect(root.getValue().getState().customServers).toMatchObject([
        { name: docsB.name },
      ]);
    } finally {
      root.unmount();
    }
  });

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
