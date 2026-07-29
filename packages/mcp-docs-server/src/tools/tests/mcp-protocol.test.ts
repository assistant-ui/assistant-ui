import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  InitializeRequestSchema,
  ListPromptsRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/core";
import { server } from "../../index.js";
import { createMcpTestClient, type McpTestClient } from "./mcp-test-client.js";

type Tool = {
  name: string;
  title?: string;
  annotations?: {
    readOnlyHint?: boolean;
    openWorldHint?: boolean;
  };
  inputSchema: {
    type?: string;
    properties?: Record<string, { description?: string }>;
    required?: string[];
  };
};

type ToolListResult = {
  tools: Tool[];
};

type ToolCallResult = {
  content: Array<{
    type: string;
  }>;
};

type PromptListResult = {
  prompts: Array<{
    name: string;
    title?: string;
  }>;
};

type PromptGetResult = {
  messages: Array<{
    content: {
      type: string;
      text?: string;
    };
  }>;
};

type InitializeResult = {
  protocolVersion: string;
  serverInfo: {
    name: string;
  };
};

function requireTool(tools: Tool[], name: string): Tool {
  const tool = tools.find((candidate) => candidate.name === name);
  expect(tool).toBeDefined();
  if (!tool) throw new Error(`Missing tool: ${name}`);
  return tool;
}

describe("MCP Protocol Integration", () => {
  let client: McpTestClient;
  let initializeResult: Promise<InitializeResult>;

  beforeEach(async () => {
    client = await createMcpTestClient(server);
    initializeResult = client.initialize() as Promise<InitializeResult>;
    await initializeResult;
  });

  afterEach(async () => {
    await client?.close();
  });

  it("handles Initialize requests", async () => {
    const request = {
      method: "initialize",
      params: {
        protocolVersion: "2025-11-25",
        capabilities: {},
        clientInfo: {
          name: "mcp-docs-server-tests",
          version: "1.0.0",
        },
      },
    };

    expect(InitializeRequestSchema.parse(request)).toBeDefined();
    await expect(initializeResult).resolves.toMatchObject({
      protocolVersion: "2025-11-25",
      serverInfo: { name: "assistant-ui-docs" },
    });
  });

  it("lists tool metadata and JSON schemas", async () => {
    const request = ListToolsRequestSchema.parse({
      method: "tools/list",
      params: {},
    });
    const result = await client.request<ToolListResult>(request);

    expect(result.tools).toHaveLength(6);

    for (const expected of [
      {
        name: "assistantUIDocs",
        title: "assistant-ui Documentation",
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      {
        name: "assistantUIExamples",
        title: "assistant-ui Examples",
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      {
        name: "assistantUISearch",
        title: "Search assistant-ui Documentation",
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      {
        name: "assistantUITemplates",
        title: "assistant-ui Templates",
        annotations: { readOnlyHint: true, openWorldHint: true },
      },
      {
        name: "assistantUITemplateDetails",
        title: "assistant-ui Template Details",
        annotations: { readOnlyHint: true, openWorldHint: true },
      },
      {
        name: "assistantUITemplatePreview",
        title: "assistant-ui Template Preview URLs",
        annotations: { readOnlyHint: false, openWorldHint: true },
      },
    ]) {
      const tool = requireTool(result.tools, expected.name);

      expect(tool).toMatchObject({
        title: expected.title,
        annotations: expected.annotations,
      });
      expect(tool.inputSchema.type).toBe("object");
      expect(tool.inputSchema.properties).toBeDefined();
    }

    const search = requireTool(result.tools, "assistantUISearch");
    expect(search.inputSchema.required ?? []).not.toContain("limit");
    expect(search.inputSchema.properties?.["query"]?.description).toBeDefined();
  });

  it("calls assistantUIDocs", async () => {
    const request = CallToolRequestSchema.parse({
      method: "tools/call",
      params: {
        name: "assistantUIDocs",
        arguments: {
          paths: ["/"],
        },
      },
    });
    const result = await client.request<ToolCallResult>(request);

    expect(result.content[0]?.type).toBe("text");
  });

  it("calls assistantUIExamples without arguments", async () => {
    const request = CallToolRequestSchema.parse({
      method: "tools/call",
      params: {
        name: "assistantUIExamples",
        arguments: {},
      },
    });
    const result = await client.request<ToolCallResult>(request);

    expect(result.content[0]?.type).toBe("text");
  });

  it("lists prompts", async () => {
    const request = ListPromptsRequestSchema.parse({
      method: "prompts/list",
      params: {},
    });
    const result = await client.request<PromptListResult>(request);
    const prompt = result.prompts.find(
      (candidate) => candidate.name === "assistant-ui-template-workflow",
    );

    expect(prompt).toMatchObject({
      title: "assistant-ui Template Workflow",
    });
  });

  it("gets the assistant-ui-template-workflow prompt", async () => {
    const request = GetPromptRequestSchema.parse({
      method: "prompts/get",
      params: {
        name: "assistant-ui-template-workflow",
        arguments: {},
      },
    });
    const result = await client.request<PromptGetResult>(request);
    const text = result.messages[0]?.content.text;

    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]?.content.type).toBe("text");
    expect(text).toContain("assistantUITemplates");
    expect(text).toContain("assistantUITemplateDetails");
    expect(text).toContain("assistantUITemplatePreview");
  });
});
