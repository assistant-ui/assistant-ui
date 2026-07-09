import { beforeEach, describe, expect, it, vi } from "vitest";
import { mergeToolkits } from "@assistant-ui/core/react";
import { AISDKToolkit } from "./generativeTools";
import { wrapModelContentEnvelope } from "./modelContentEnvelope";

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

const never = <T>() => new Promise<T>(() => {});

describe("AISDKToolkit.tools()", () => {
  it("accepts a merged app toolkit from feature toolkits", async () => {
    const filesToolkit = {
      search_files: {
        type: "backend",
        description: "Search files",
        parameters: { type: "object", properties: {} },
        execute: async () => "files",
      } as never,
    };
    const calendarToolkit = {
      create_event: {
        type: "backend",
        description: "Create a calendar event",
        parameters: { type: "object", properties: {} },
        execute: async () => "event",
      } as never,
    };
    const appToolkit = mergeToolkits(filesToolkit, calendarToolkit);

    const toolSet = await new AISDKToolkit({ toolkit: appToolkit }).tools();

    expect(toolSet.search_files?.description).toBe("Search files");
    expect(toolSet.search_files?.execute).toBeTypeOf("function");
    expect(toolSet.create_event?.description).toBe("Create a calendar event");
    expect(toolSet.create_event?.execute).toBeTypeOf("function");
  });

  it("merges frontend tools with toolkit tools", async () => {
    const toolSet = await new AISDKToolkit({
      toolkit: {
        serverTool: {
          type: "backend",
          description: "Server tool",
          parameters: { type: "object", properties: {} },
          execute: async () => "ok",
        } as never,
      },
    }).tools({
      frontend: {
        clientTool: {
          parameters: { type: "object", properties: {} },
        },
      },
    });

    expect(toolSet.clientTool).toBeDefined();
    expect(toolSet.serverTool?.description).toBe("Server tool");
    expect(toolSet.serverTool?.execute).toBeTypeOf("function");
  });

  it("keeps a flat toolkit tool named tools", async () => {
    const toolSet = await new AISDKToolkit({
      toolkit: {
        tools: {
          type: "backend",
          description: "Actually a tool, not config",
          parameters: { type: "object", properties: {} },
          execute: async () => "ok",
        } as never,
      },
    }).tools();

    expect(toolSet.tools?.description).toBe("Actually a tool, not config");
    expect(toolSet.tools?.execute).toBeTypeOf("function");
  });

  it("converts provider tools without an execute function", async () => {
    const toolSet = await new AISDKToolkit({
      toolkit: {
        web_search: {
          type: "provider",
          providerId: "openai.web_search_preview",
          args: { searchContextSize: "low" },
        },
      },
    }).tools();

    expect(toolSet.web_search).toMatchObject({
      type: "provider",
      id: "openai.web_search_preview",
      args: { searchContextSize: "low" },
    });
    expect(toolSet.web_search).not.toHaveProperty("inputSchema");
    expect(toolSet.web_search).not.toHaveProperty("execute");
  });

  it("forwards provider tool parameters and providerOptions when present", async () => {
    const toolSet = await new AISDKToolkit({
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
    }).tools();

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

  it("forwards explicit false supportsDeferredResults", async () => {
    const toolSet = await new AISDKToolkit({
      toolkit: {
        web_search: {
          type: "provider",
          providerId: "openai.web_search_preview",
          args: { searchContextSize: "low" },
          supportsDeferredResults: false,
        },
      },
    }).tools();

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

  it("does not connect disabled MCP toolkit entries", async () => {
    const toolkit = new AISDKToolkit({
      toolkit: {
        local: {
          type: "mcp",
          server: { type: "http", url: "http://localhost:3001/mcp" },
          disabled: true,
        },
      },
    });

    await expect(toolkit.tools()).resolves.toEqual({});

    expect(mocks.createMCPClient).not.toHaveBeenCalled();
    expect(mocks.tools).not.toHaveBeenCalled();
  });

  it("filters disabled MCP tools from enabled toolkit entries", async () => {
    mocks.tools.mockResolvedValue({
      publicSearch: { inputSchema: {} },
      privateSearch: { inputSchema: {} },
    });
    mocks.createMCPClient.mockResolvedValue({
      tools: mocks.tools,
      close: mocks.close,
    });

    const toolkit = new AISDKToolkit({
      toolkit: {
        local: {
          type: "mcp",
          server: { type: "http", url: "http://localhost:3001/mcp" },
          tools: {
            privateSearch: {
              disabled: true,
            },
          },
        },
      },
    });

    await expect(toolkit.tools()).resolves.toEqual({
      publicSearch: { inputSchema: {} },
    });

    expect(mocks.createMCPClient).toHaveBeenCalledTimes(1);
    expect(mocks.tools).toHaveBeenCalledTimes(1);
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

  it("times out MCP client creation", async () => {
    vi.useFakeTimers();
    mocks.createMCPClient.mockReturnValue(never());

    const toolkit = new AISDKToolkit({
      toolkit: {
        docs: {
          type: "mcp",
          server: {
            type: "http",
            url: "http://localhost:3001/mcp",
            connectionTimeout: 10_000,
          },
        },
      },
    });

    try {
      const toolsPromise = toolkit.tools();
      const expectedRejection = expect(toolsPromise).rejects.toThrow(
        'MCP toolkit entry "docs" timed out while connecting after 10000ms.',
      );
      await vi.advanceTimersByTimeAsync(10_000);
      await expectedRejection;

      mocks.createMCPClient.mockResolvedValueOnce({
        tools: vi.fn().mockResolvedValue({ echo: { inputSchema: {} } }),
        close: mocks.close,
      });
      await expect(toolkit.tools()).resolves.toHaveProperty("echo");
      expect(mocks.createMCPClient).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("times out MCP tool listing", async () => {
    vi.useFakeTimers();
    const close = vi.fn().mockResolvedValue(undefined);
    mocks.createMCPClient.mockResolvedValue({
      tools: vi.fn(() => never()),
      close,
    });

    const toolkit = new AISDKToolkit({
      toolkit: {
        docs: {
          type: "mcp",
          server: {
            type: "http",
            url: "http://localhost:3001/mcp",
            connectionTimeout: 10_000,
          },
        },
      },
    });

    try {
      const toolsPromise = toolkit.tools();
      const expectedRejection = expect(toolsPromise).rejects.toThrow(
        'MCP toolkit entry "docs" timed out while listing tools after 10000ms.',
      );
      await vi.advanceTimersByTimeAsync(10_000);
      await expectedRejection;
      expect(close).toHaveBeenCalledTimes(1);

      mocks.createMCPClient.mockResolvedValueOnce({
        tools: vi.fn().mockResolvedValue({ echo: { inputSchema: {} } }),
        close: mocks.close,
      });
      await expect(toolkit.tools()).resolves.toHaveProperty("echo");
      expect(mocks.createMCPClient).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
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

  it("rejects MCP tool names that collide with toolkit tools", async () => {
    mocks.tools.mockResolvedValue({ search: { inputSchema: {} } });
    mocks.createMCPClient.mockResolvedValue({
      tools: mocks.tools,
      close: mocks.close,
    });

    const toolkit = new AISDKToolkit({
      toolkit: {
        docs: {
          type: "mcp",
          server: { type: "http", url: "http://localhost:3001/mcp" },
        },
        search: {
          type: "backend",
          parameters: { type: "object", properties: {} },
          execute: async () => "local search",
        } as never,
      },
    });

    await expect(toolkit.tools()).rejects.toThrow(
      'MCP tool "search" from "docs" conflicts with toolkit tool "search"',
    );
  });

  it("rejects MCP tool names that collide with provider tools", async () => {
    mocks.tools.mockResolvedValue({ web_search: { inputSchema: {} } });
    mocks.createMCPClient.mockResolvedValue({
      tools: mocks.tools,
      close: mocks.close,
    });

    const toolkit = new AISDKToolkit({
      toolkit: {
        docs: {
          type: "mcp",
          server: { type: "http", url: "http://localhost:3001/mcp" },
        },
        web_search: {
          type: "provider",
          providerId: "openai.web_search_preview",
          args: { searchContextSize: "low" },
        },
      },
    });

    await expect(toolkit.tools()).rejects.toThrow(
      'MCP tool "web_search" from "docs" conflicts with provider tool "web_search"',
    );
  });

  it("rejects MCP tool names that collide with uploaded frontend tools", async () => {
    mocks.tools.mockResolvedValue({ clientTool: { inputSchema: {} } });
    mocks.createMCPClient.mockResolvedValue({
      tools: mocks.tools,
      close: mocks.close,
    });

    const toolkit = new AISDKToolkit({
      toolkit: {
        docs: {
          type: "mcp",
          server: { type: "http", url: "http://localhost:3001/mcp" },
        },
      },
    });

    await expect(
      toolkit.tools({
        frontend: {
          clientTool: {
            parameters: { type: "object", properties: {} },
          },
        },
      }),
    ).rejects.toThrow(
      'MCP tool "clientTool" from "docs" conflicts with frontend tool "clientTool"',
    );
  });

  it("ignores disabled MCP tools during name collision checks", async () => {
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
          tools: {
            echo: {
              disabled: true,
            },
          },
        },
        second: {
          type: "mcp",
          server: { type: "http", url: "http://localhost:3002/mcp" },
        },
      },
    });

    await expect(toolkit.tools()).resolves.toEqual({
      echo: { inputSchema: {} },
    });
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

describe("AISDKToolkit toModelOutput", () => {
  const createWeatherTools = (toModelOutput?: any) =>
    new AISDKToolkit({
      toolkit: {
        get_weather: {
          ...(toModelOutput && { toModelOutput }),
        },
      } as any,
    }).tools();

  it("adapts assistant-ui model content parts to the AI SDK tool output shape", async () => {
    const tools = await createWeatherTools(({ output }: any) => [
      { type: "text", text: `Weather card displayed: ${output.location}` },
    ]);

    const output = await tools.get_weather!.toModelOutput!({
      toolCallId: "tc-weather",
      input: {},
      output: { location: "San Francisco" },
    });

    expect(output).toEqual({
      type: "content",
      value: [{ type: "text", text: "Weather card displayed: San Francisco" }],
    });
  });

  it("uses stored model content envelopes without re-running the custom projector", async () => {
    let called = false;
    const tools = await createWeatherTools(() => {
      called = true;
      return [{ type: "text", text: "recomputed" }];
    });

    const output = await tools.get_weather!.toModelOutput!({
      toolCallId: "tc-weather",
      input: {},
      output: wrapModelContentEnvelope({ location: "San Francisco" }, [
        { type: "text", text: "cached weather receipt" },
      ]),
    });

    expect(called).toBe(false);
    expect(output).toEqual({
      type: "content",
      value: [{ type: "text", text: "cached weather receipt" }],
    });
  });

  it("falls back to default model output when no custom projector is defined", async () => {
    const tools = await createWeatherTools();

    const output = await tools.get_weather!.toModelOutput!({
      toolCallId: "tc-weather",
      input: {},
      output: { location: "San Francisco" },
    });

    expect(output).toEqual({
      type: "json",
      value: { location: "San Francisco" },
    });
  });

  it("uses stored model content envelopes when no custom projector is defined", async () => {
    const tools = await createWeatherTools();

    const output = await tools.get_weather!.toModelOutput!({
      toolCallId: "tc-weather",
      input: {},
      output: wrapModelContentEnvelope({ location: "San Francisco" }, [
        { type: "text", text: "cached weather receipt" },
      ]),
    });

    expect(output).toEqual({
      type: "content",
      value: [{ type: "text", text: "cached weather receipt" }],
    });
  });
});
