import { createTapRoot, useResource } from "@assistant-ui/tap";
import { describe, expect, it } from "vitest";
import { defineConnector } from "../connector";
import type { MCPConnector } from "../mcp-scope";
import { assertUniqueServerIds } from "../utils/serverId";
import { McpManagerResource } from "./McpManagerResource";
import { McpMemoryStorage } from "./storage/McpMemoryStorage";

const connector = (id: string, name = id): MCPConnector =>
  defineConnector({
    id,
    name,
    url: `https://example.com/${id}/mcp`,
    auth: { type: "none" },
  });

const mount = (connectors: MCPConnector[]) =>
  createTapRoot(function Root() {
    return useResource(
      McpManagerResource({
        connectors,
        storage: McpMemoryStorage(),
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
});
