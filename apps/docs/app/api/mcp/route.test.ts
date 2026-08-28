import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchPreviewSession: vi.fn(),
  fetchTemplateContract: vi.fn(),
}));

vi.mock("@/lib/xulux/sandbox-contract", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/xulux/sandbox-contract")>()),
  fetchPreviewSession: mocks.fetchPreviewSession,
  fetchTemplateContract: mocks.fetchTemplateContract,
}));

vi.mock("@/lib/get-llm-text", () => ({ getLLMText: vi.fn() }));

vi.mock("@/lib/source", () => {
  const makeSource = () => ({
    pageTree: { children: [] },
    getPage: vi.fn(),
    getPages: vi.fn(() => []),
  });

  return {
    source: makeSource(),
    examples: makeSource(),
    design: makeSource(),
    standalone: makeSource(),
    tapDocs: makeSource(),
    getTapDocsPage: vi.fn(),
    getTapDocsPages: vi.fn(() => []),
  };
});

import { buildXuluxMcpCatalog } from "@/lib/xulux/mcp-catalog";
import { listTemplates } from "@/lib/xulux/template-service";
import { POST } from "./route";

const ORIGIN = "https://www.assistant-ui.com";
const encoder = new TextEncoder();

type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: number;
  result?: unknown;
  error?: { code: number; message: string };
};

type ToolCallResult = {
  content: Array<{ type: string; text?: string }>;
  isError?: boolean;
};

let nextId = 1;

async function requestMcp(
  method: string,
  params: Record<string, unknown>,
): Promise<JsonRpcResponse> {
  const request = new Request(`${ORIGIN}/api/mcp`, {
    method: "POST",
    headers: { Accept: "application/json" },
    body: encoder.encode(
      JSON.stringify({ jsonrpc: "2.0", id: nextId++, method, params }),
    ),
  });
  const response = await POST(request as Parameters<typeof POST>[0]);
  expect(response.status).toBe(200);
  return (await response.json()) as JsonRpcResponse;
}

function getToolCallResult(response: JsonRpcResponse): ToolCallResult {
  expect(response.error).toBeUndefined();
  return response.result as ToolCallResult;
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/mcp", () => {
  it("initializes the assistant-ui docs server", async () => {
    const response = await requestMcp("initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "route-test-client", version: "1.0.0" },
    });

    expect(response.error).toBeUndefined();
    expect(response.result).toMatchObject({
      serverInfo: { name: "assistant-ui-docs", version: "1.0.0" },
    });
  });

  it("lists the seven public tools and the template workflow prompt", async () => {
    const toolsResponse = await requestMcp("tools/list", {});
    expect(toolsResponse.error).toBeUndefined();
    expect(
      (toolsResponse.result as { tools: Array<{ name: string }> }).tools.map(
        (tool) => tool.name,
      ),
    ).toEqual([
      "list_pages",
      "get_navigation",
      "search_docs",
      "read_page",
      "list_templates",
      "read_template",
      "preview_template",
    ]);

    const promptsResponse = await requestMcp("prompts/list", {});
    expect(promptsResponse.error).toBeUndefined();
    expect(
      (
        promptsResponse.result as { prompts: Array<{ name: string }> }
      ).prompts.map((prompt) => prompt.name),
    ).toContain("assistant-ui-template-workflow");
  });

  it("returns the catalog-backed template list", async () => {
    const response = await requestMcp("tools/call", {
      name: "list_templates",
      arguments: {},
    });
    const result = getToolCallResult(response);
    const text = result.content.find((block) => block.type === "text")?.text;

    expect(text).toBeDefined();
    expect(JSON.parse(text!)).toEqual(
      listTemplates(buildXuluxMcpCatalog(ORIGIN)),
    );
  });

  it("returns the template authoring surface for read_template", async () => {
    mocks.fetchTemplateContract.mockResolvedValue(null);

    const response = await requestMcp("tools/call", {
      name: "read_template",
      arguments: { templateId: "base-assistant-ui" },
    });
    const result = getToolCallResult(response);
    const text = result.content.find((block) => block.type === "text")?.text;
    const payload = JSON.parse(text!) as Record<string, unknown>;

    expect(result.isError).toBeFalsy();
    expect(payload).toMatchObject({ id: "base-assistant-ui" });
    expect(payload["configRoots"]).toBeDefined();
    expect(payload["rules"]).toBeDefined();
    expect(mocks.fetchTemplateContract).toHaveBeenCalledTimes(1);
  });

  it("creates a configured preview session through the sandbox contract", async () => {
    mocks.fetchPreviewSession.mockResolvedValue(
      new Response(
        JSON.stringify({
          previewUrl: "/preview#studio",
          validationWarnings: [],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const response = await requestMcp("tools/call", {
      name: "preview_template",
      arguments: {
        templateId: "base-assistant-ui",
        config: { brandTheme: { preset: "assistantDark" } },
      },
    });
    const result = getToolCallResult(response);
    const text = result.content.find((block) => block.type === "text")?.text;
    const payload = JSON.parse(text!) as {
      success: boolean;
      customized: boolean;
      previewUrl: string;
    };

    expect(result.isError).toBeFalsy();
    expect(payload).toMatchObject({ success: true, customized: true });
    expect(payload.previewUrl).toContain("/preview");
    expect(payload.previewUrl.endsWith("#studio")).toBe(true);
    expect(mocks.fetchPreviewSession).toHaveBeenCalledTimes(1);
    expect(mocks.fetchPreviewSession).toHaveBeenCalledWith(
      expect.any(String),
      null,
      { brandTheme: { preset: "assistantDark" } },
    );
  });

  it("serves the template workflow prompt", async () => {
    const response = await requestMcp("prompts/get", {
      name: "assistant-ui-template-workflow",
    });

    expect(response.error).toBeUndefined();
    const messages = (
      response.result as { messages: Array<{ content: { text: string } }> }
    ).messages;
    expect(messages[0]!.content.text).toContain("list_templates");
  });

  it("rejects unsupported preview config roots before the sandbox", async () => {
    const response = await requestMcp("tools/call", {
      name: "preview_template",
      arguments: {
        templateId: "base-assistant-ui",
        config: { banana: {} },
      },
    });
    const result = getToolCallResult(response);
    const text = result.content.find((block) => block.type === "text")?.text;

    expect(result.isError).toBe(true);
    expect(text).toContain("Input validation error");
    expect(text).toContain("banana");
    expect(mocks.fetchPreviewSession).not.toHaveBeenCalled();
    expect(mocks.fetchTemplateContract).not.toHaveBeenCalled();
  });
});
