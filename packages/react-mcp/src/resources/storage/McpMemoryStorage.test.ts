import { createTapRoot, resource, useResource } from "@assistant-ui/tap";
import { describe, expect, it } from "vitest";
import { useState } from "react";
import type { MCPStorage } from "./types";
import { McpMemoryStorage } from "./McpMemoryStorage";

const mountWithRerender = () => {
  const seen: MCPStorage[] = [];
  let setTick!: (update: (value: number) => number) => void;

  const useHost = () => {
    const [, setValue] = useState(0);
    setTick = setValue;
    const storage = useResource(McpMemoryStorage());
    seen.push(storage);
    return storage;
  };
  const Host = resource(useHost);

  createTapRoot(function MemoryStorageRoot() {
    return useResource(Host());
  });

  return {
    seen,
    latest: () => seen[seen.length - 1]!,
    rerender: () => setTick((value) => value + 1),
  };
};

describe("McpMemoryStorage", () => {
  it("returns the same instance across re-renders", () => {
    const { seen, rerender } = mountWithRerender();

    rerender();
    rerender();

    expect(seen.length).toBeGreaterThan(1);
    expect(new Set(seen).size).toBe(1);
  });

  it("keeps persisted auth state across re-renders", async () => {
    const { seen, latest, rerender } = mountWithRerender();
    await seen[0]!.saveAuthState("docs", { codeVerifier: "pkce-verifier" });

    rerender();

    await expect(latest().loadAuthState("docs")).resolves.toEqual({
      codeVerifier: "pkce-verifier",
    });
  });

  it("keeps custom servers across re-renders", async () => {
    const { seen, latest, rerender } = mountWithRerender();
    await seen[0]!.saveCustomServers([
      {
        id: "docs",
        name: "Docs",
        url: "https://docs.example.com/mcp",
        auth: { type: "none" },
        createdAt: 1,
      },
    ]);

    rerender();

    await expect(latest().loadCustomServers()).resolves.toHaveLength(1);
  });
});

describe("McpMemoryStorage scope identity", () => {
  it("scopes each instance uniquely and keeps it stable per instance", () => {
    let first!: MCPStorage;
    let second!: MCPStorage;
    const seen: (string | undefined)[] = [];
    let rerender!: () => void;

    const Host = resource(function useHost() {
      const [, setTick] = useState(0);
      rerender = () => setTick((n) => n + 1);
      first = useResource(McpMemoryStorage());
      seen.push(first.scopeId);
      return first;
    });
    createTapRoot(function MemoryScopeRootA() {
      return useResource(Host());
    });
    createTapRoot(function MemoryScopeRootB() {
      second = useResource(McpMemoryStorage());
      return second;
    });
    rerender();

    expect(first.scopeId).toMatch(/^memory:/);
    expect(second.scopeId).toMatch(/^memory:/);
    expect(first.scopeId).not.toBe(second.scopeId);
    expect(new Set(seen).size).toBe(1);
  });
});
