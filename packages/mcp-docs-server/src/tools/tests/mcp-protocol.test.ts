import { describe, it, expect } from "vitest";
import { server } from "../../index.js";
import {
  InitializeRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  type InitializeRequest,
  type ListToolsRequest,
  type CallToolRequest,
  type ListPromptsRequest,
  type GetPromptRequest,
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
    expect(result.tools).toHaveLength(6);

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

    const searchTool = result.tools.find(
      (t: any) => t.name === "assistantUISearch",
    );
    expect(searchTool).toBeDefined();
    expect(searchTool.inputSchema).toBeDefined();
    expect(searchTool.inputSchema.type).toBe("object");
    expect(searchTool.inputSchema.properties).toBeDefined();

    // registerTool metadata is surfaced on tools/list: `title` is a
    // top-level field, `annotations` carries only the hint flags.
    expect(docsTool.title).toBe("assistant-ui Documentation");
    expect(docsTool.annotations?.readOnlyHint).toBe(true);
    expect(docsTool.annotations?.openWorldHint).toBe(false);
    expect(examplesTool.title).toBe("assistant-ui Examples");
    expect(examplesTool.annotations?.readOnlyHint).toBe(true);
    expect(examplesTool.annotations?.openWorldHint).toBe(false);
    expect(searchTool.title).toBe("Search assistant-ui Documentation");
    expect(searchTool.annotations?.readOnlyHint).toBe(true);
    expect(searchTool.annotations?.openWorldHint).toBe(false);

    const xuluxListTool = result.tools.find(
      (t: any) => t.name === "assistantUITemplates",
    );
    expect(xuluxListTool).toBeDefined();
    expect(xuluxListTool.title).toBe("assistant-ui Templates");
    expect(xuluxListTool.annotations?.readOnlyHint).toBe(true);
    expect(xuluxListTool.annotations?.openWorldHint).toBe(true);

    const xuluxDetailsTool = result.tools.find(
      (t: any) => t.name === "assistantUITemplateDetails",
    );
    expect(xuluxDetailsTool).toBeDefined();
    expect(xuluxDetailsTool.title).toBe("assistant-ui Template Details");
    expect(xuluxDetailsTool.annotations?.readOnlyHint).toBe(true);
    expect(xuluxDetailsTool.annotations?.openWorldHint).toBe(true);

    const xuluxPreviewTool = result.tools.find(
      (t: any) => t.name === "assistantUITemplatePreview",
    );
    expect(xuluxPreviewTool).toBeDefined();
    expect(xuluxPreviewTool.title).toBe("assistant-ui Template Preview URLs");
    expect(xuluxPreviewTool.annotations?.readOnlyHint).toBe(false);
    expect(xuluxPreviewTool.annotations?.openWorldHint).toBe(true);
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

  it("should handle ListPrompts request", async () => {
    const request: ListPromptsRequest = {
      method: "prompts/list",
      params: {},
    };

    const parsed = ListPromptsRequestSchema.parse(request);
    expect(parsed).toBeDefined();

    const handlers = (server as any).server._requestHandlers;
    expect(handlers.get("prompts/list")).toBeDefined();

    const handler = handlers.get("prompts/list");
    const result = await handler(parsed, {});

    expect(result.prompts).toBeInstanceOf(Array);
    const prompt = result.prompts.find(
      (p: any) => p.name === "assistant-ui-template-workflow",
    );
    expect(prompt).toBeDefined();
    expect(prompt.title).toBe("assistant-ui Template Workflow");
  });

  it("should handle GetPrompt request for assistant-ui-template-workflow", async () => {
    const request: GetPromptRequest = {
      method: "prompts/get",
      params: {
        name: "assistant-ui-template-workflow",
        arguments: {},
      },
    };

    const parsed = GetPromptRequestSchema.parse(request);
    expect(parsed).toBeDefined();

    const handlers = (server as any).server._requestHandlers;
    expect(handlers.get("prompts/get")).toBeDefined();

    const handler = handlers.get("prompts/get");
    const result = await handler(parsed, {});

    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].content.type).toBe("text");
    expect(result.messages[0].content.text).toContain("assistantUITemplates");
    expect(result.messages[0].content.text).toContain(
      "assistantUITemplateDetails",
    );
    expect(result.messages[0].content.text).toContain(
      "assistantUITemplatePreview",
    );
  });
});
