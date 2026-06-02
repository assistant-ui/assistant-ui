import { beforeEach, describe, expect, it, vi } from "vitest";
import { AISDKToolkit, generativeTools } from "./generativeTools";

const mocks = vi.hoisted(() => ({
  close: vi.fn(),
  tools: vi.fn(),
  createMCPClient: vi.fn(),
}));

vi.mock("@ai-sdk/mcp", () => ({
  createMCPClient: mocks.createMCPClient,
}));

vi.mock("@ai-sdk/mcp/mcp-stdio", () => ({
  Experimental_StdioMCPTransport: vi.fn((config) => ({
    type: "stdio",
    config,
  })),
}));

describe("generativeTools", () => {
  beforeEach(() => {
    mocks.close.mockReset();
    mocks.tools.mockReset();
    mocks.createMCPClient.mockReset();
  });

  it("merges frontend tools with toolkit tools", () => {
    const toolSet = generativeTools({
      frontendTools: {
        clientTool: {
          parameters: { type: "object", properties: {} },
        },
      },
      toolkit: {
        serverTool: {
          type: "backend",
          description: "Server tool",
          parameters: { type: "object", properties: {} },
          execute: async () => "ok",
        } as never,
      },
    });

    expect(toolSet.clientTool).toBeDefined();
    expect(toolSet.serverTool?.description).toBe("Server tool");
    expect(toolSet.serverTool?.execute).toBeTypeOf("function");
  });

  it("keeps a flat toolkit tool named tools", () => {
    const toolSet = generativeTools({
      toolkit: {
        tools: {
          type: "backend",
          description: "Actually a tool, not config",
          parameters: { type: "object", properties: {} },
          execute: async () => "ok",
        } as never,
      },
    });

    expect(toolSet.tools?.description).toBe("Actually a tool, not config");
    expect(toolSet.tools?.execute).toBeTypeOf("function");
  });

  it("rejects MCP entries because they require pooled clients", () => {
    expect(() =>
      generativeTools({
        toolkit: {
          docs: {
            type: "mcp",
            server: { type: "http", url: "http://localhost:3001/mcp" },
          },
        },
      }),
    ).toThrow(/requires AISDKToolkit/);
  });

  it("converts provider tools without an execute function", () => {
    const toolSet = generativeTools({
      toolkit: {
        web_search: {
          type: "provider",
          providerId: "openai.web_search_preview",
          args: { searchContextSize: "low" },
        },
      },
    });

    expect(toolSet.web_search).toMatchObject({
      type: "provider",
      id: "openai.web_search_preview",
      args: { searchContextSize: "low" },
    });
    expect(toolSet.web_search).not.toHaveProperty("inputSchema");
    expect(toolSet.web_search).not.toHaveProperty("execute");
  });

  it("forwards provider tool parameters and providerOptions when present", () => {
    const toolSet = generativeTools({
      toolkit: {
        web_search: {
          type: "provider",
          providerId: "openai.web_search_preview",
          args: { searchContextSize: "low" },
          parameters: {
            type: "object",
            properties: {
              query: { type: "string" },
            },
            required: ["query"],
          },
          providerOptions: {
            openai: { rankingOptions: { scoreThreshold: 0.5 } },
          },
        },
      },
    });

    expect(toolSet.web_search).toMatchObject({
      type: "provider",
      id: "openai.web_search_preview",
      args: { searchContextSize: "low" },
      providerOptions: {
        openai: { rankingOptions: { scoreThreshold: 0.5 } },
      },
    });
    expect(toolSet.web_search).toHaveProperty("inputSchema");
  });

  it("forwards explicit false supportsDeferredResults", () => {
    const toolSet = generativeTools({
      toolkit: {
        web_search: {
          type: "provider",
          providerId: "openai.web_search_preview",
          args: { searchContextSize: "low" },
          supportsDeferredResults: false,
        },
      },
    });

    expect(toolSet.web_search).toMatchObject({
      supportsDeferredResults: false,
    });
  });
});

describe("AISDKToolkit", () => {
  beforeEach(() => {
    mocks.close.mockReset();
    mocks.tools.mockReset();
    mocks.createMCPClient.mockReset();
  });

  it("loads MCP tools through pooled clients", async () => {
    mocks.tools.mockResolvedValue({ echo: { inputSchema: {} } });
    mocks.createMCPClient.mockResolvedValue({
      tools: mocks.tools,
      close: mocks.close,
    });

    const toolkit = new AISDKToolkit({
      toolkit: {
        local: {
          type: "mcp",
          server: { type: "http", url: "http://localhost:3001/mcp" },
        },
      },
    });

    await expect(toolkit.tools()).resolves.toHaveProperty("echo");
    await toolkit.tools();

    expect(mocks.createMCPClient).toHaveBeenCalledTimes(1);
    expect(mocks.createMCPClient).toHaveBeenCalledWith({
      transport: {
        type: "http",
        url: "http://localhost:3001/mcp",
      },
    });
    expect(mocks.tools).toHaveBeenCalledTimes(2);
  });

  it("closes pooled MCP clients", async () => {
    mocks.tools.mockResolvedValue({});
    mocks.createMCPClient.mockResolvedValue({
      tools: mocks.tools,
      close: mocks.close,
    });

    const toolkit = new AISDKToolkit({
      toolkit: {
        local: {
          type: "mcp",
          server: { type: "sse", url: "http://localhost:3001/sse" },
        },
      },
    });

    await toolkit.tools();
    await toolkit.close();

    expect(mocks.close).toHaveBeenCalledTimes(1);
  });

  it("clears pooled MCP clients even when initialization fails", async () => {
    const error = new Error("connect failed");
    const closeError = new Error("close failed");
    const close = vi.fn().mockRejectedValue(closeError);
    mocks.tools.mockResolvedValue({});
    mocks.createMCPClient
      .mockResolvedValueOnce({
        tools: mocks.tools,
        close,
      })
      .mockRejectedValueOnce(error);

    const toolkit = new AISDKToolkit({
      toolkit: {
        first: {
          type: "mcp",
          server: { type: "http", url: "http://localhost:3001/mcp" },
        },
        second: {
          type: "mcp",
          server: { type: "http", url: "http://localhost:3002/mcp" },
        },
      },
    });

    const toolsPromise = toolkit.tools();
    await expect(toolkit.close()).rejects.toMatchObject({
      errors: [error, closeError],
    });
    await expect(toolsPromise).rejects.toThrow(error);
    expect(close).toHaveBeenCalledTimes(1);

    await expect(toolkit.close()).resolves.toBeUndefined();
  });

  it("evicts failed MCP client initialization so later calls can retry", async () => {
    const error = new Error("connect failed");
    mocks.createMCPClient.mockRejectedValueOnce(error).mockResolvedValueOnce({
      tools: vi.fn().mockResolvedValue({ echo: { inputSchema: {} } }),
      close: mocks.close,
    });

    const toolkit = new AISDKToolkit({
      toolkit: {
        local: {
          type: "mcp",
          server: { type: "http", url: "http://localhost:3001/mcp" },
        },
      },
    });

    await expect(toolkit.tools()).rejects.toThrow(error);
    await expect(toolkit.tools()).resolves.toHaveProperty("echo");
    expect(mocks.createMCPClient).toHaveBeenCalledTimes(2);
  });

  it("rejects duplicate MCP tool names", async () => {
    mocks.createMCPClient
      .mockResolvedValueOnce({
        tools: vi.fn().mockResolvedValue({ echo: { inputSchema: {} } }),
        close: mocks.close,
      })
      .mockResolvedValueOnce({
        tools: vi.fn().mockResolvedValue({ echo: { inputSchema: {} } }),
        close: mocks.close,
      });

    const toolkit = new AISDKToolkit({
      toolkit: {
        first: {
          type: "mcp",
          server: { type: "http", url: "http://localhost:3001/mcp" },
        },
        second: {
          type: "mcp",
          server: { type: "http", url: "http://localhost:3002/mcp" },
        },
      },
    });

    await expect(toolkit.tools()).rejects.toThrow(
      /MCP tool name collision: "echo"/,
    );
  });

  it("includes provider tools alongside MCP tools", async () => {
    mocks.tools.mockResolvedValue({ echo: { inputSchema: {} } });
    mocks.createMCPClient.mockResolvedValue({
      tools: mocks.tools,
      close: mocks.close,
    });

    const toolkit = new AISDKToolkit({
      toolkit: {
        local: {
          type: "mcp",
          server: { type: "http", url: "http://localhost:3001/mcp" },
        },
        web_search: {
          type: "provider",
          providerId: "openai.web_search_preview",
          args: { searchContextSize: "low" },
          supportsDeferredResults: false,
        },
      },
    });

    await expect(toolkit.tools()).resolves.toMatchObject({
      echo: { inputSchema: {} },
      web_search: {
        type: "provider",
        id: "openai.web_search_preview",
        args: { searchContextSize: "low" },
        supportsDeferredResults: false,
      },
    });
  });
});
