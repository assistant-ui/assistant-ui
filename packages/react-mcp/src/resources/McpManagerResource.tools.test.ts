import { createAssistantClient } from "@assistant-ui/store/client";
import { Tools } from "@assistant-ui/core/react";
import { toToolsJSONSchema } from "assistant-stream";
import { describe, expect, it, vi } from "vitest";
import { defineConnector } from "../connector";
import { McpManagerResource } from "./McpManagerResource";
import { McpMemoryStorage } from "./storage/McpMemoryStorage";
import { McpCustomStorage } from "./storage/McpCustomStorage";
import type { MCPCustomServerRecord } from "../mcp-scope";
import * as mcp from "../index";

const mocks = vi.hoisted(() => ({
  toolNames: ["search"],
  callTool: vi.fn(async (_url: string, _params: unknown) => ({ content: [] })),
}));

vi.mock("@modelcontextprotocol/client", async (importOriginal) => ({
  ...(await importOriginal()),
  Client: class {
    url = "";
    async connect(transport: { url: string }) {
      this.url = transport.url;
    }
    async listTools() {
      return {
        tools: mocks.toolNames.map((name) => ({
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

const mount = (props: Parameters<typeof McpManagerResource>[0]) => {
  const handle = createAssistantClient({
    mcp: McpManagerResource({ autoConnect: false, ...props }),
  });
  handle.subscribe(() => {});
  return handle;
};

describe("McpManagerResource tool registration", () => {
  it.each(["search", "get_pull_request_review_comments", "files.read"])(
    "resolves a named renderer for the registered %s tool",
    async (toolName) => {
      mocks.toolNames = [toolName];
      const handle = createAssistantClient({
        mcp: McpManagerResource({
          autoConnect: false,
          storage: McpMemoryStorage(),
        }),
        tools: Tools({}),
      });
      handle.subscribe(() => {});
      let unregister: (() => void) | undefined;
      try {
        const aui = handle.getClient();
        await vi.waitFor(() =>
          expect(aui.mcp.getState().isHydrated).toBe(true),
        );
        const id = await aui.mcp.addCustomServer({
          name: "GitHub",
          url: "https://example.com/mcp",
          auth: { type: "none" },
        });
        const render = () => null;
        unregister = aui.tools.setToolUI(
          mcp.getMcpToolName(id, toolName),
          render,
        );
        await vi.waitFor(() =>
          expect(aui.mcp.getState().servers).toHaveLength(1),
        );
        await aui.mcp.server({ id }).connect();
        await vi.waitFor(() => {
          const names = Object.keys(
            toToolsJSONSchema(aui.modelContext.getModelContext().tools),
          );
          expect(names).toHaveLength(1);
          expect(aui.tools.getState().toolUIs[names[0]!]![0]!.render).toBe(
            render,
          );
        });
        expect(aui.mcp.server({ id }).getState().tools[0]!.name).toBe(toolName);
      } finally {
        unregister?.();
        handle.destroy();
      }
    },
  );

  it.each([
    "search",
    "a".repeat(26),
    "a".repeat(27),
    "get_pull_request_review_comments",
  ])(
    "registers a provider-compatible name for the custom server tool %s",
    async (toolName) => {
      mocks.toolNames = [toolName];
      const handle = mount({ storage: McpMemoryStorage() });
      try {
        const aui = handle.getClient();
        await vi.waitFor(() =>
          expect(aui.mcp.getState().isHydrated).toBe(true),
        );
        const id = await aui.mcp.addCustomServer({
          name: "GitHub",
          url: "https://example.com/mcp",
          auth: { type: "none" },
        });
        expect(id).toHaveLength(36);
        await vi.waitFor(() =>
          expect(aui.mcp.getState().servers).toHaveLength(1),
        );
        await aui.mcp.server({ id }).connect();
        await vi.waitFor(() =>
          expect(aui.modelContext.getState().toolNames).toHaveLength(1),
        );
        const context = aui.modelContext.getModelContext();
        const names = Object.keys(toToolsJSONSchema(context.tools));
        expect(names).toHaveLength(1);
        expect(names[0]).toMatch(/^[A-Za-z0-9_-]{1,64}$/);
        if (toolName.length <= 26) expect(names[0]).toBe(`${id}__${toolName}`);
        await context.tools![names[0]!]!.execute!(
          { pull_number: 42 },
          {} as never,
        );
        expect(mocks.callTool).toHaveBeenCalledWith("https://example.com/mcp", {
          name: toolName,
          arguments: { pull_number: 42 },
        });
      } finally {
        handle.destroy();
      }
    },
  );

  it("keeps aliases stable across list order, reconnects, and storage reloads", async () => {
    const toolNames = [
      "get_pull_request_review_comments",
      `${"long_shared_prefix_".repeat(4)}first`,
      `${"long_shared_prefix_".repeat(4)}second`,
    ];
    const records: MCPCustomServerRecord[] = ["a", "b"].map((letter) => ({
      id: letter.repeat(36),
      name: letter,
      url: `https://example.com/${letter}/mcp`,
      auth: { type: "none" },
      createdAt: 1,
    }));
    const registrations: { name: string; target: unknown }[][] = [];
    for (const reverse of [false, true]) {
      mocks.toolNames = reverse ? [...toolNames].reverse() : toolNames;
      const handle = mount({
        storage: McpCustomStorage({
          loadCustomServers: async () =>
            reverse ? [...records].reverse() : records,
          saveCustomServers: async () => {},
          loadAuthState: async () => null,
          saveAuthState: async () => {},
          clearAuthState: async () => {},
        }),
      });
      try {
        const aui = handle.getClient();
        await vi.waitFor(() =>
          expect(aui.mcp.getState().servers).toHaveLength(2),
        );
        for (const record of records)
          await aui.mcp.server({ id: record.id }).connect();
        await vi.waitFor(() =>
          expect(aui.modelContext.getState().toolNames).toHaveLength(6),
        );
        const context = aui.modelContext.getModelContext();
        const names = Object.keys(context.tools!).sort();
        expect(names.every((name) => /^[A-Za-z0-9_-]{1,64}$/.test(name))).toBe(
          true,
        );
        for (const toolName of toolNames) {
          const matches = Object.values(context.tools!).filter(
            (tool) => tool.description === `Call ${toolName}`,
          );
          expect(matches).toHaveLength(2);
        }
        for (const record of records) {
          await aui.mcp.server({ id: record.id }).disconnect();
          await aui.mcp.server({ id: record.id }).connect();
        }
        await vi.waitFor(() =>
          expect([...aui.modelContext.getState().toolNames].sort()).toEqual(
            names,
          ),
        );
        const currentTools = aui.modelContext.getModelContext().tools!;
        const registration = [];
        for (const name of names) {
          const tool = currentTools[name]!;
          await tool.execute!({}, {} as never);
          registration.push({ name, target: mocks.callTool.mock.calls.at(-1) });
        }
        expect(mocks.callTool).toHaveBeenCalledTimes(
          (registrations.length + 1) * 6,
        );
        for (const record of records) {
          for (const name of toolNames) {
            expect(mocks.callTool).toHaveBeenCalledWith(record.url, {
              name,
              arguments: {},
            });
          }
        }
        registrations.push(registration);
      } finally {
        handle.destroy();
      }
    }
    expect(registrations[1]).toEqual(registrations[0]);
  });

  it("keeps valid connector names and aliases invalid characters", async () => {
    mocks.toolNames = ["search", "files.read"];
    const handle = mount({
      connectors: [
        defineConnector({
          id: "docs",
          name: "Docs",
          url: "https://example.com/mcp",
          auth: { type: "none" },
        }),
      ],
      storage: McpMemoryStorage(),
    });
    try {
      const aui = handle.getClient();
      await aui.mcp.connector({ index: 0 }).connect();
      await vi.waitFor(() =>
        expect(aui.modelContext.getState().toolNames).toHaveLength(2),
      );
      const names = aui.modelContext.getState().toolNames;
      expect(names).toContain("docs__search");
      expect(names.every((name) => /^[A-Za-z0-9_-]{1,64}$/.test(name))).toBe(
        true,
      );
    } finally {
      handle.destroy();
    }
  });
});
