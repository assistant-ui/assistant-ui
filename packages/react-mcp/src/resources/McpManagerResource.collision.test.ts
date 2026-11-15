import { createAssistantClient } from "@assistant-ui/store/client";
import { describe, expect, it, onTestFinished, vi } from "vitest";
import { defineConnector } from "../connector";
import { McpManagerResource } from "./McpManagerResource";
import { McpMemoryStorage } from "./storage/McpMemoryStorage";

const mocks = vi.hoisted(() => ({
  toolsByUrl: {} as Record<string, string[]>,
  callTool: vi.fn(async (_url: string, _params: unknown) => ({ content: [] })),
}));

// Finding a real 64-bit collision is slow, so every tool named `collide*`
// maps to one alias here.
vi.mock("../utils/toolName", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils/toolName")>();
  return {
    ...actual,
    getMcpToolName: (serverId: string, toolName: string) =>
      toolName.startsWith("collide")
        ? "__mcp_0000000000000000_collide"
        : actual.getMcpToolName(serverId, toolName),
  };
});

vi.mock("@modelcontextprotocol/client", async (importOriginal) => ({
  ...(await importOriginal()),
  Client: class {
    url = "";
    async connect(transport: { url: string }) {
      this.url = transport.url;
    }
    async listTools() {
      return {
        tools: (mocks.toolsByUrl[this.url] ?? []).map((name) => ({
          name,
          description: `Call ${name}`,
          inputSchema: { type: "object", properties: {} },
        })),
      };
    }
    callTool(params: unknown) {
      return mocks.callTool(this.url, params);
    }
    setRequestHandler() {}
    setNotificationHandler() {}
  },
  StreamableHTTPClientTransport: class {
    url: string;
    constructor(url: URL) {
      this.url = url.href;
    }
    async close() {}
  },
}));

const connector = (id: string, url: string) =>
  defineConnector({
    id,
    name: id,
    url,
    auth: { type: "none" },
    requireApproval: false,
  });

describe("McpManagerResource tool name collisions", () => {
  it("registers neither tool when two servers' tools share a name", async () => {
    mocks.toolsByUrl = {
      "https://docs.example.com/mcp": ["collide.a", "search"],
      "https://other.example.com/mcp": ["collide.b"],
    };
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    onTestFinished(() => warn.mockRestore());
    const handle = createAssistantClient({
      mcp: McpManagerResource({
        autoConnect: false,
        connectors: [
          connector("docs", "https://docs.example.com/mcp"),
          connector("other", "https://other.example.com/mcp"),
        ],
        storage: McpMemoryStorage(),
      }),
    });
    handle.subscribe(() => {});
    try {
      const aui = handle.getClient();
      await aui.mcp.connector({ index: 0 }).connect();
      await vi.waitFor(() =>
        expect(aui.modelContext.getState().toolNames).toEqual(
          expect.arrayContaining([
            "docs__search",
            "__mcp_0000000000000000_collide",
          ]),
        ),
      );
      await aui.mcp.connector({ index: 1 }).connect();
      await vi.waitFor(() =>
        expect(aui.modelContext.getState().toolNames).toEqual(["docs__search"]),
      );
      expect(warn).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining('"__mcp_0000000000000000_collide"'),
      );
      // Reconnecting recomputes the toolkit; the warning doesn't repeat.
      await aui.mcp.connector({ index: 0 }).disconnect?.();
      await aui.mcp.connector({ index: 0 }).connect();
      await vi.waitFor(() =>
        expect(aui.modelContext.getState().toolNames).toEqual(["docs__search"]),
      );
      expect(warn).toHaveBeenCalledTimes(1);
      expect(
        aui.modelContext.getModelContext().tools?.[
          "__mcp_0000000000000000_collide"
        ],
      ).toBeUndefined();
    } finally {
      handle.destroy();
    }
  });

  it("keeps one tool when a server lists the same tool twice", async () => {
    mocks.toolsByUrl = {
      "https://docs.example.com/mcp": ["collide.a", "collide.a"],
    };
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    onTestFinished(() => warn.mockRestore());
    const handle = createAssistantClient({
      mcp: McpManagerResource({
        autoConnect: false,
        connectors: [connector("docs", "https://docs.example.com/mcp")],
        storage: McpMemoryStorage(),
      }),
    });
    handle.subscribe(() => {});
    try {
      const aui = handle.getClient();
      await aui.mcp.connector({ index: 0 }).connect();
      await vi.waitFor(() =>
        expect(aui.modelContext.getState().toolNames).toEqual([
          "__mcp_0000000000000000_collide",
        ]),
      );
      expect(warn).not.toHaveBeenCalled();
    } finally {
      handle.destroy();
    }
  });
});
