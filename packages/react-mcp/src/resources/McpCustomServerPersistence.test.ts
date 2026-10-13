import { createTapRoot, useResource } from "@assistant-ui/tap";
import { describe, expect, it, vi } from "vitest";
import type { MCPCustomServerRecord } from "../mcp-scope";
import type { MCPStorage } from "./storage/types";
import { McpCustomServersResource } from "./McpCustomServerPersistence";

describe("McpCustomServersResource", () => {
  it("allows a revisited scope to hydrate after the previous load rejects", async () => {
    let rejectLoad!: (error: Error) => void;
    const loaded = new Promise<MCPCustomServerRecord[]>((_, reject) => {
      rejectLoad = reject;
    });
    const persisted: MCPCustomServerRecord = {
      id: "docs",
      name: "Docs",
      url: "https://example.com/docs/mcp",
      auth: { type: "none" },
      createdAt: 1,
    };
    const storage: MCPStorage = {
      loadCustomServers: vi.fn(() => loaded),
      saveCustomServers: vi.fn(async () => {}),
      loadAuthState: async () => null,
      saveAuthState: async () => {},
      clearAuthState: async () => {},
    };
    const replacement = {
      ...storage,
      loadCustomServers: vi.fn(async () => [persisted]),
    };
    const persistenceQueues = new Map<string, Promise<void>>();
    const mount = (current: MCPStorage) =>
      createTapRoot(function Root() {
        return useResource(
          McpCustomServersResource({
            storage: current,
            scopeKey: "test",
            persistenceQueues,
          }),
        );
      });
    const first = mount(storage);
    await vi.waitFor(() =>
      expect(storage.loadCustomServers).toHaveBeenCalled(),
    );
    first.unmount();
    const second = mount(replacement);

    try {
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(replacement.loadCustomServers).not.toHaveBeenCalled();
      rejectLoad(new Error("storage unavailable"));
      await vi.waitFor(() => expect(second.getValue().isHydrated).toBe(true));
      expect(second.getValue().customServers).toEqual([persisted]);
      expect(storage.saveCustomServers).not.toHaveBeenCalled();
    } finally {
      rejectLoad(new Error("storage unavailable"));
      second.unmount();
    }
  });

  it("merges a local mutation made before hydration and persists the result", async () => {
    let resolveLoad: (records: MCPCustomServerRecord[]) => void = () => {};
    const loaded = new Promise<MCPCustomServerRecord[]>((resolve) => {
      resolveLoad = resolve;
    });
    const saveCustomServers = vi.fn(async () => {});
    const storage: MCPStorage = {
      loadCustomServers: () => loaded,
      saveCustomServers,
      loadAuthState: async () => null,
      saveAuthState: async () => {},
      clearAuthState: async () => {},
    };
    const persisted: MCPCustomServerRecord = {
      id: "persisted",
      name: "Persisted",
      url: "https://example.com/persisted",
      auth: { type: "none" },
      createdAt: 1,
    };
    const local: MCPCustomServerRecord = {
      ...persisted,
      id: "local",
      name: "Local",
    };
    const persistenceQueues = new Map<string, Promise<void>>();
    const root = createTapRoot(function Root() {
      return useResource(
        McpCustomServersResource({
          storage,
          scopeKey: "test",
          persistenceQueues,
        }),
      );
    });

    try {
      root.getValue().updateCustomServers((records) => [...records, local]);
      resolveLoad([persisted]);
      await vi.waitFor(() => expect(root.getValue().isHydrated).toBe(true));
      expect(root.getValue().customServers).toEqual([persisted, local]);
      await vi.waitFor(() =>
        expect(saveCustomServers).toHaveBeenCalledWith([persisted, local]),
      );
    } finally {
      root.unmount();
    }
  });
});
