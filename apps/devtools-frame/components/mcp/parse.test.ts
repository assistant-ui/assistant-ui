import { describe, expect, it } from "vitest";
import { parseMcpManager } from "./parse";

describe("parseMcpManager", () => {
  it("parses servers with connection state, error, and tools", () => {
    const manager = parseMcpManager({
      isHydrated: true,
      servers: [
        {
          id: "s1",
          kind: "connector",
          name: "GitHub",
          url: "https://mcp.example.com",
          connectionState: "connected",
          lastError: null,
          authorizationUrl: null,
          tools: [
            { name: "list_repos", description: "list repositories" },
            { name: "create_issue" },
          ],
        },
        {
          id: "s2",
          kind: "custom",
          name: "Broken",
          connectionState: "error",
          lastError: { message: "ECONNREFUSED" },
          authorizationUrl: null,
          tools: [],
        },
      ],
    });

    expect(manager).not.toBeNull();
    if (!manager) return;
    expect(manager.isHydrated).toBe(true);
    expect(manager.servers).toHaveLength(2);
    expect(manager.servers[0]).toMatchObject({
      id: "s1",
      name: "GitHub",
      connectionState: "connected",
    });
    expect(manager.servers[0]?.tools).toHaveLength(2);
    expect(manager.servers[1]?.lastError).toBe("ECONNREFUSED");
  });

  it("falls back to connectors + customServers when servers is absent", () => {
    const manager = parseMcpManager({
      connectors: [
        { id: "c1", name: "A", connectionState: "disconnected", tools: [] },
      ],
      customServers: [
        { id: "x1", name: "B", connectionState: "authRequired", tools: [] },
      ],
    });
    if (!manager) return;
    expect(manager.servers.map((s) => s.id)).toEqual(["c1", "x1"]);
  });

  it("returns null for non-records", () => {
    expect(parseMcpManager(undefined)).toBeNull();
  });
});
