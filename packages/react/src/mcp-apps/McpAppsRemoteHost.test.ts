import { createTapRoot, useResource } from "@assistant-ui/tap";
import { describe, expect, it, vi } from "vitest";
import { McpAppsRemoteHost } from "./McpAppsRemoteHost";

const mount = (fetch: typeof globalThis.fetch) =>
  createTapRoot(function Root() {
    return useResource(
      McpAppsRemoteHost({
        url: "/api/mcp-apps",
        fetch,
      }),
    );
  });

describe("McpAppsRemoteHost", () => {
  it("posts the requested method and params to the host route", async () => {
    const fetch = vi.fn(async () =>
      Response.json({ content: [{ type: "text", text: "ok" }] }),
    ) as unknown as typeof globalThis.fetch;
    const root = mount(fetch);

    try {
      await expect(
        root.getValue().callTool({
          name: "search",
          arguments: { query: "docs" },
        }),
      ).resolves.toEqual({ content: [{ type: "text", text: "ok" }] });

      expect(fetch).toHaveBeenCalledWith("/api/mcp-apps", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          method: "tools/call",
          params: { name: "search", arguments: { query: "docs" } },
        }),
      });
    } finally {
      root.unmount();
    }
  });

  it("posts serverId params verbatim for tool calls and resource loads", async () => {
    const fetch = vi.fn(async () =>
      Response.json({ content: [{ type: "text", text: "ok" }] }),
    ) as unknown as typeof globalThis.fetch;
    const root = mount(fetch);

    try {
      await root.getValue().callTool({
        name: "search",
        arguments: { query: "docs" },
        serverId: "search-server",
      });
      await root.getValue().loadResource({
        uri: "ui://example/search",
        serverId: "search-server",
      });

      expect(fetch).toHaveBeenNthCalledWith(1, "/api/mcp-apps", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          method: "tools/call",
          params: {
            name: "search",
            arguments: { query: "docs" },
            serverId: "search-server",
          },
        }),
      });
      expect(fetch).toHaveBeenNthCalledWith(2, "/api/mcp-apps", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          method: "mcp-apps/read-resource",
          params: {
            uri: "ui://example/search",
            serverId: "search-server",
          },
        }),
      });
    } finally {
      root.unmount();
    }
  });

  it("includes method, url, status, and text body in host request errors", async () => {
    const fetch = vi.fn(
      async () =>
        new Response("Missing tool name", {
          status: 500,
          statusText: "Internal Server Error",
        }),
    ) as unknown as typeof globalThis.fetch;
    const root = mount(fetch);

    try {
      await expect(
        root.getValue().callTool({ name: "search" }),
      ).rejects.toThrow(
        'MCP App host request "tools/call" to "/api/mcp-apps" failed with 500 Internal Server Error: Missing tool name',
      );
    } finally {
      root.unmount();
    }
  });

  it("uses JSON error messages from failed host responses", async () => {
    const fetch = vi.fn(async () =>
      Response.json(
        { error: { message: "resources/list is not supported" } },
        { status: 400, statusText: "Bad Request" },
      ),
    ) as unknown as typeof globalThis.fetch;
    const root = mount(fetch);

    try {
      await expect(root.getValue().listResources()).rejects.toThrow(
        'MCP App host request "resources/list" to "/api/mcp-apps" failed with 400 Bad Request: resources/list is not supported',
      );
    } finally {
      root.unmount();
    }
  });
});
