import { describe, it, expect } from "vitest";
import { server } from "../../index.js";
import {
  InitializeRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
  type InitializeRequest,
  type ListToolsRequest,
  type CallToolRequest,
} from "@modelcontextprotocol/sdk/types.js";

describe("MCP Protocol Integration", () => {
  // These tests verify the MCP protocol layer handles requests correctly
  // and that parameter schemas are properly converted to JSON schemas
  it("should handle Initialize request", async () => {
    const request: InitializeRequest = {
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: {
          name: "test-client",
          version: "1.0.0",
        },
      },
    };

    // Parse and validate the request
    const parsed = InitializeRequestSchema.parse(request);
    expect(parsed).toBeDefined();

    // The server should have an initialize handler set up
    const handlers = (server as any).server._requestHandlers;
    expect(handlers).toBeDefined();
    expect(handlers.get("initialize")).toBeDefined();
  });

  it("should handle ListTools request", async () => {
    const request: ListToolsRequest = {
      method: "tools/list",
      params: {},
    };

    // Parse and validate the request
    const parsed = ListToolsRequestSchema.parse(request);
    expect(parsed).toBeDefined();

    // The server should have a tools/list handler
    const handlers = (server as any).server._requestHandlers;
    expect(handlers.get("tools/list")).toBeDefined();

    // Call the handler
    const handler = handlers.get("tools/list");
    const result = await handler(parsed, {});

    expect(result).toBeDefined();
    expect(result.tools).toBeInstanceOf(Array);
    expect(result.tools).toHaveLength(2);

    // Check the tools have proper JSON schemas
    const docsTool = result.tools.find(
      (t: any) => t.name === "assistantUIDocs",
    );
    expect(docsTool).toBeDefined();
    expect(docsTool.inputSchema).toBeDefined();
    expect(docsTool.inputSchema.type).toBe("object");
    expect(docsTool.inputSchema.properties).toBeDefined();

    const examplesTool = result.tools.find(
      (t: any) => t.name === "assistantUIExamples",
    );
    expect(examplesTool).toBeDefined();
    expect(examplesTool.inputSchema).toBeDefined();
    expect(examplesTool.inputSchema.type).toBe("object");
    expect(examplesTool.inputSchema.properties).toBeDefined();
  });

  it("should handle CallTool request for assistantUIDocs", async () => {
    const request: CallToolRequest = {
      method: "tools/call",
      params: {
        name: "assistantUIDocs",
        arguments: {
          paths: ["/"],
        },
      },
    };

    // Parse and validate the request
    const parsed = CallToolRequestSchema.parse(request);
    expect(parsed).toBeDefined();

    // The server should have a tools/call handler
    const handlers = (server as any).server._requestHandlers;
    expect(handlers.get("tools/call")).toBeDefined();

    // Call the handler through the MCP protocol layer
    const handler = handlers.get("tools/call");
    const result = await handler(parsed, {});

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(result.content[0].type).toBe("text");
  });

  it("should handle CallTool request for assistantUIExamples with no arguments", async () => {
    const request: CallToolRequest = {
      method: "tools/call",
      params: {
        name: "assistantUIExamples",
        arguments: {},
      },
    };

    // Parse and validate the request
    const parsed = CallToolRequestSchema.parse(request);
    expect(parsed).toBeDefined();

    // The server should have a tools/call handler
    const handlers = (server as any).server._requestHandlers;
    expect(handlers.get("tools/call")).toBeDefined();

    // Call the handler
    const handler = handlers.get("tools/call");
    const result = await handler(parsed, {});

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(result.content[0].type).toBe("text");
  });
});
