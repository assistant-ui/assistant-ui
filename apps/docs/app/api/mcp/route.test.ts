import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchPreviewSession: vi.fn(),
  fetchTemplateContract: vi.fn(),
  checkTemplateRateLimit: vi.fn(),
  checkDocsRateLimit: vi.fn(),
  captureImmediate: vi.fn(async () => {}),
}));

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (task: () => unknown) => void task(),
}));

vi.mock("@/lib/posthog-server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/posthog-server")>()),
  posthogServer: { captureImmediate: mocks.captureImmediate },
}));

vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal()),
  checkMcpTemplateToolRateLimit: mocks.checkTemplateRateLimit,
  checkMcpDocsToolRateLimit: mocks.checkDocsRateLimit,
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

  const docsPage = (
    url: string,
    title: string,
    description: string,
    headings: string[],
    contents: string[],
  ) => ({
    url,
    data: {
      title,
      description,
      structuredData: () => ({
        headings: headings.map((content) => ({
          id: content.toLowerCase(),
          content,
        })),
        contents: contents.map((content) => ({ content })),
      }),
    },
  });

  return {
    source: {
      ...makeSource(),
      getPages: vi.fn(() => [
        docsPage(
          "/docs/ui/thread",
          "Thread",
          "Render a conversation.",
          [],
          ["An unrelated opening paragraph."],
        ),
        docsPage(
          "/docs/guides/keyboard",
          "Keyboard",
          "Shortcuts.",
          ["Bindings"],
          [
            "Press the escape key to dismiss the composer autocomplete popover.",
          ],
        ),
      ]),
    },
    examples: makeSource(),
    design: makeSource(),
    elementsDocs: makeSource(),
    standalone: makeSource(),
    docsSiteSources: {
      "safe-content-frame": makeSource(),
      "generative-frame": makeSource(),
      diagrammatic: makeSource(),
      "remote-components": makeSource(),
    },
    siteTree: () => ({ children: [] }),
  };
});

import { buildXuluxMcpCatalog } from "@/lib/xulux/mcp-catalog";
import {
  readPageInputSchema,
  searchDocsInputSchema,
} from "@/lib/mcp-tool-definitions";
import {
  registerWebMcpTools,
  type FetchLike,
  type WebMcpModelContext,
} from "@/lib/webmcp-tools";
import { listTemplates } from "@/lib/xulux/template-service";
import { GET, POST } from "./route";

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

type SearchedPage = {
  title: string;
  url: string;
  description?: string;
  headings?: string[];
  excerpt?: string;
};

function searchedPages(result: ToolCallResult): SearchedPage[] {
  return JSON.parse(
    result.content.find((block) => block.type === "text")?.text ?? "[]",
  ) as SearchedPage[];
}

function registerBrowserTools(fetchImpl: FetchLike) {
  const tools: Parameters<WebMcpModelContext["registerTool"]>[0][] = [];
  registerWebMcpTools(
    {
      registerTool: (tool) => {
        tools.push(tool);
      },
    },
    fetchImpl,
  );
  return tools;
}

function inputSchemaShape(schema: Record<string, unknown>) {
  const properties = schema["properties"] as Record<
    string,
    Record<string, unknown>
  >;
  return {
    type: schema["type"],
    properties: Object.fromEntries(
      Object.entries(properties).map(([name, property]) => [
        name,
        { type: property["type"] },
      ]),
    ),
    required: schema["required"],
    additionalProperties: schema["additionalProperties"],
  };
}

async function requestDescriptor(accept?: string) {
  const request = new Request(`${ORIGIN}/api/mcp`, {
    ...(accept ? { headers: { Accept: accept } } : {}),
  });
  return await GET(request as Parameters<typeof GET>[0]);
}

describe("GET /api/mcp", () => {
  it("refuses the streamable HTTP server-to-client stream", async () => {
    const response = await requestDescriptor("text/event-stream");

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("POST, OPTIONS");
    expect(await response.json()).toEqual({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed." },
      id: null,
    });
  });

  it("refuses a stream open whatever its casing or media range position", async () => {
    const response = await requestDescriptor(
      "application/json, Text/Event-Stream;q=0.9",
    );

    expect(response.status).toBe(405);
  });

  it("serves the descriptor to discovery clients", async () => {
    for (const accept of [undefined, "*/*", "application/json"]) {
      const response = await requestDescriptor(accept);

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        name: "assistant-ui-docs",
        protocol: "mcp",
      });
    }
  });
});

describe("POST /api/mcp", () => {
  it("caps nested tool input at 10,000 elements", async () => {
    const response = await requestMcp("tools/call", {
      name: "preview_template",
      arguments: {
        templateId: "base-assistant-ui",
        config: { hostUi: Array.from({ length: 10_001 }, (_, i) => i) },
      },
    });

    const result = getToolCallResult(response);
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("maximum of 10000 elements");
    expect(mocks.fetchPreviewSession).not.toHaveBeenCalled();
  });

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

  it("sends instructions that name every tool on initialize", async () => {
    const response = await requestMcp("initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "route-test-client", version: "1.0.0" },
    });

    const { instructions } = response.result as { instructions?: string };
    expect(typeof instructions).toBe("string");

    const toolsResponse = await requestMcp("tools/list", {});
    const tools = (toolsResponse.result as { tools: Array<{ name: string }> })
      .tools;
    for (const tool of tools) expect(instructions).toContain(tool.name);
    expect(instructions).toContain("assistant-ui-template-workflow");
  });

  it("describes every tool input property", async () => {
    const toolsResponse = await requestMcp("tools/list", {});
    const tools = (
      toolsResponse.result as {
        tools: Array<{ name: string; inputSchema: Record<string, unknown> }>;
      }
    ).tools;

    const undescribed: string[] = [];
    const visit = (path: string, schema: Record<string, unknown>) => {
      const properties = schema["properties"] as
        | Record<string, Record<string, unknown>>
        | undefined;
      for (const [name, property] of Object.entries(properties ?? {})) {
        const propertyPath = `${path}.${name}`;
        if (!property["description"]) undescribed.push(propertyPath);
        visit(propertyPath, property);
      }
    };
    for (const tool of tools) visit(tool.name, tool.inputSchema);

    expect(undescribed).toEqual([]);
    const preview = tools.find((tool) => tool.name === "preview_template")!;
    const config = (
      preview.inputSchema["properties"] as Record<
        string,
        { properties: Record<string, unknown> }
      >
    )["config"]!;
    expect(Object.keys(config.properties)).toEqual([
      "hostUi",
      "assistant",
      "brandTheme",
    ]);
  });

  it("lists the seven public tools and the template workflow prompt", async () => {
    const toolsResponse = await requestMcp("tools/list", {});
    expect(toolsResponse.error).toBeUndefined();
    const tools = (
      toolsResponse.result as {
        tools: Array<{ name: string; inputSchema: Record<string, unknown> }>;
      }
    ).tools;
    expect(tools.map((tool) => tool.name)).toEqual([
      "list_pages",
      "get_navigation",
      "search_docs",
      "read_page",
      "list_templates",
      "read_template",
      "preview_template",
    ]);
    expect(
      tools.find((tool) => tool.name === "search_docs")?.inputSchema,
    ).toMatchObject(searchDocsInputSchema);
    expect(
      tools.find((tool) => tool.name === "read_page")?.inputSchema,
    ).toMatchObject(readPageInputSchema);

    const promptsResponse = await requestMcp("prompts/list", {});
    expect(promptsResponse.error).toBeUndefined();
    expect(
      (
        promptsResponse.result as { prompts: Array<{ name: string }> }
      ).prompts.map((prompt) => prompt.name),
    ).toContain("assistant-ui-template-workflow");
  });

  it("executes the WebMCP adapter through the route transport", async () => {
    let responseContentType: string | null = null;
    const routeFetch: FetchLike = async (url, init) => {
      const request = new Request(new URL(url, ORIGIN), {
        method: init.method,
        headers: init.headers,
        ...(init.body === undefined ? {} : { body: init.body }),
        ...(init.signal ? { signal: init.signal } : {}),
      });
      const response = await POST(request as Parameters<typeof POST>[0]);
      responseContentType = response.headers.get("content-type");
      return response;
    };
    const tools = registerBrowserTools(routeFetch);
    const searchTool = tools.find((tool) => tool.name === "searchDocs");
    if (!searchTool) throw new Error("missing searchDocs tool");

    const searched = (await searchTool.execute({
      query: "dismiss the popover",
    })) as ToolCallResult;

    const pages = searchedPages(searched);
    expect(pages.map((page) => page.url)).toEqual(["/docs/guides/keyboard"]);
    expect(pages[0]?.excerpt).toContain("autocomplete popover");
    expect(responseContentType).toContain("application/json");
  });

  it("keeps browser input shapes compatible with the route tools", async () => {
    const toolsResponse = await requestMcp("tools/list", {});
    const routeTools = (
      toolsResponse.result as {
        tools: Array<{ name: string; inputSchema: Record<string, unknown> }>;
      }
    ).tools;
    const browserTools = registerBrowserTools(async () => {
      throw new Error("not executed");
    });
    const mappings = [
      ["searchDocs", "search_docs"],
      ["getDoc", "read_page"],
      ["getExample", "read_page"],
    ] as const;

    for (const [browserName, routeName] of mappings) {
      const browserTool = browserTools.find(
        (tool) => tool.name === browserName,
      );
      const routeTool = routeTools.find((tool) => tool.name === routeName);
      expect(browserTool, `missing browser tool ${browserName}`).toBeDefined();
      expect(routeTool, `missing route tool ${routeName}`).toBeDefined();
      expect(inputSchemaShape(browserTool!.inputSchema)).toEqual(
        inputSchemaShape(routeTool!.inputSchema),
      );
    }
  });

  it("ranks search_docs over page content, not metadata alone", async () => {
    const response = await requestMcp("tools/call", {
      name: "search_docs",
      arguments: { query: "dismiss the popover" },
    });
    const pages = searchedPages(getToolCallResult(response));

    expect(pages.map((page) => page.url)).toEqual(["/docs/guides/keyboard"]);
    expect(pages[0]?.excerpt).toContain("autocomplete popover");
  });

  it("ranks a heading-only match and returns the headings with it", async () => {
    const response = await requestMcp("tools/call", {
      name: "search_docs",
      arguments: { query: "bindings" },
    });
    const pages = searchedPages(getToolCallResult(response));

    expect(pages.map((page) => page.url)).toEqual(["/docs/guides/keyboard"]);
    expect(pages[0]?.headings).toEqual(["Bindings"]);
  });

  it("falls back to the opening paragraph when only metadata matched", async () => {
    const response = await requestMcp("tools/call", {
      name: "search_docs",
      arguments: { query: "thread" },
    });
    const pages = searchedPages(getToolCallResult(response));

    expect(pages.map((page) => page.url)).toEqual(["/docs/ui/thread"]);
    expect(pages[0]?.excerpt).toBe("An unrelated opening paragraph.");
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

  it("meters the two tools that call out to a sandbox", async () => {
    mocks.fetchTemplateContract.mockResolvedValue(null);

    await requestMcp("tools/call", {
      name: "read_template",
      arguments: { templateId: "base-assistant-ui" },
    });
    await requestMcp("tools/call", {
      name: "preview_template",
      arguments: { templateId: "base-assistant-ui" },
    });

    expect(mocks.checkTemplateRateLimit).toHaveBeenCalledTimes(2);
    expect(mocks.checkTemplateRateLimit.mock.calls[0]?.[0]).toMatchObject({
      url: `${ORIGIN}/api/mcp`,
    });
  });

  it("meters every in-process tool against the docs budget", async () => {
    await requestMcp("tools/call", { name: "list_templates", arguments: {} });
    await requestMcp("tools/call", {
      name: "search_docs",
      arguments: { query: "runtime" },
    });
    await requestMcp("tools/call", { name: "get_navigation", arguments: {} });
    await requestMcp("tools/call", { name: "list_pages", arguments: {} });

    expect(mocks.checkDocsRateLimit).toHaveBeenCalledTimes(4);
    expect(mocks.checkDocsRateLimit.mock.calls[0]?.[0]).toMatchObject({
      url: `${ORIGIN}/api/mcp`,
    });
    expect(mocks.checkTemplateRateLimit).not.toHaveBeenCalled();
  });

  it("lists pages under a legacy tap docs prefix", async () => {
    const { source } = await import("@/lib/source");
    vi.mocked(source.getPages).mockReturnValueOnce([
      {
        url: "/docs/store/scopes",
        data: { title: "Scopes", description: "Scopes." },
      },
      {
        url: "/docs/installation",
        data: { title: "Installation", description: "Install." },
      },
    ] as never);

    const response = await requestMcp("tools/call", {
      name: "list_pages",
      arguments: { path: "/tap/docs/store" },
    });
    const text = getToolCallResult(response).content.find(
      (block) => block.type === "text",
    )?.text;

    expect(text).toContain("/docs/store/scopes");
    expect(text).not.toContain("/docs/installation");
  });

  it("lists the page a moved docs path now lives at", async () => {
    const { source } = await import("@/lib/source");
    vi.mocked(source.getPages).mockReturnValueOnce([
      {
        url: "/docs/concepts/context-api",
        data: { title: "Context API", description: "Context." },
      },
      {
        url: "/docs/installation",
        data: { title: "Installation", description: "Install." },
      },
    ] as never);

    const response = await requestMcp("tools/call", {
      name: "list_pages",
      arguments: { path: "/docs/guides/context-api" },
    });
    const text = getToolCallResult(response).content.find(
      (block) => block.type === "text",
    )?.text;

    expect(text).toContain("/docs/concepts/context-api");
    expect(text).not.toContain("/docs/installation");
  });

  it("meters the docs resources that repeat the tool work", async () => {
    await requestMcp("resources/read", {
      uri: "assistant-ui://navigation",
    });
    await requestMcp("resources/list", {});

    expect(mocks.checkDocsRateLimit).toHaveBeenCalledTimes(2);
  });

  it("meters the dynamic docs resource before it reaches the page", async () => {
    mocks.checkDocsRateLimit.mockResolvedValueOnce(
      new Response("Docs tool rate limit exceeded", {
        status: 429,
        headers: { "Retry-After": "12" },
      }),
    );

    const denied = await requestMcp("resources/read", {
      uri: "assistant-ui://docs/getting-started",
    });

    expect(denied.error?.message).toContain("Docs tool rate limit exceeded");

    const allowed = await requestMcp("resources/read", {
      uri: "assistant-ui://docs/getting-started",
    });

    expect(allowed.error?.message).toContain("Page not found");
    expect(mocks.checkDocsRateLimit).toHaveBeenCalledTimes(2);
  });

  it("keeps the docs budget off the sandbox-calling template tools", async () => {
    mocks.fetchTemplateContract.mockResolvedValue(null);

    await requestMcp("tools/call", {
      name: "read_template",
      arguments: { templateId: "base-assistant-ui" },
    });

    expect(mocks.checkTemplateRateLimit).toHaveBeenCalledTimes(1);
    expect(mocks.checkDocsRateLimit).not.toHaveBeenCalled();
  });

  it("surfaces a throttled docs tool without rendering the page", async () => {
    mocks.checkDocsRateLimit.mockResolvedValueOnce(
      new Response("Docs tool rate limit exceeded", {
        status: 429,
        headers: { "Retry-After": "12" },
      }),
    );

    const response = await requestMcp("tools/call", {
      name: "read_page",
      arguments: { path: "docs/getting-started" },
    });
    const result = getToolCallResult(response);
    const text = result.content.find((block) => block.type === "text")?.text;

    expect(result.isError).toBe(true);
    expect(text).toBe("Docs tool rate limit exceeded. Retry in 12s.");
  });

  it("serves the docs tools unmetered when the rate-limit store is down", async () => {
    mocks.checkDocsRateLimit.mockResolvedValueOnce(
      new Response("Public assistant temporarily unavailable", { status: 503 }),
    );

    const response = await requestMcp("tools/call", {
      name: "search_docs",
      arguments: { query: "keyboard" },
    });
    const result = getToolCallResult(response);

    expect(result.isError).toBeFalsy();
    expect(searchedPages(result).map((page) => page.url)).toEqual([
      "/docs/guides/keyboard",
    ]);
  });

  it("surfaces a throttled template tool without reaching the sandbox", async () => {
    mocks.checkTemplateRateLimit.mockResolvedValueOnce(
      new Response("Template tool rate limit exceeded", {
        status: 429,
        headers: { "Retry-After": "30" },
      }),
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

    expect(result.isError).toBe(true);
    expect(text).toBe(
      "Template tool rate limit exceeded. Retry in 30s. The assistant-ui docs tools remain available.",
    );
    expect(mocks.fetchPreviewSession).not.toHaveBeenCalled();
  });

  it("does not tell an MCP client the public assistant is down", async () => {
    mocks.checkTemplateRateLimit.mockResolvedValueOnce(
      new Response("Public assistant temporarily unavailable", { status: 503 }),
    );

    const response = await requestMcp("tools/call", {
      name: "read_template",
      arguments: { templateId: "base-assistant-ui" },
    });
    const result = getToolCallResult(response);
    const text = result.content.find((block) => block.type === "text")?.text;

    expect(result.isError).toBe(true);
    expect(text).toBe(
      "Template tools are temporarily unavailable. The assistant-ui docs tools remain available.",
    );
    expect(mocks.fetchTemplateContract).not.toHaveBeenCalled();
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

describe("agent reads over MCP", () => {
  const AGENT_HEADERS = {
    Accept: "application/json",
    "user-agent": "claude-code/2.1.332 (cli)",
    "x-vercel-ip-country": "US",
  };

  async function postMcp(body: string, headers: Record<string, string> = {}) {
    mocks.captureImmediate.mockClear();
    const response = await POST(
      new Request(`${ORIGIN}/api/mcp`, {
        method: "POST",
        headers: { ...AGENT_HEADERS, ...headers },
        body: encoder.encode(body),
      }) as Parameters<typeof POST>[0],
    );
    await response.clone().text();
    await new Promise((resolve) => setTimeout(resolve, 0));
    return response;
  }

  const callTool = (name: string, args: Record<string, unknown>) =>
    postMcp(
      JSON.stringify({
        jsonrpc: "2.0",
        id: nextId++,
        method: "tools/call",
        params: { name, arguments: args },
      }),
    );

  const captured = () =>
    mocks.captureImmediate.mock.calls.map(
      (call) => (call as unknown as [{ event: string; properties: object }])[0],
    );

  it("counts a search with its query, result count, client and latency", async () => {
    await callTool("search_docs", { query: "escape key composer popover" });

    expect(captured()).toEqual([
      {
        distinctId: "docs-agent",
        event: "mcp_tool_called",
        properties: {
          tool: "search_docs",
          client: "claude-code",
          latency_ms: expect.any(Number),
          query: "escape key composer popover",
          status: "ok",
          result_count: 1,
          $process_person_profile: false,
          $geoip_disable: true,
        },
      },
    ]);
  });

  it("marks a search that found nothing, the docs' search gaps", async () => {
    await callTool("search_docs", { query: "zzqx nonexistent topic" });

    expect(captured()[0]?.properties).toMatchObject({
      status: "empty",
      result_count: 0,
      query: "zzqx nonexistent topic",
    });
  });

  it("counts a page that does not exist with the path the agent asked for", async () => {
    await callTool("read_page", { path: "/docs/not-a-page" });

    expect(captured()[0]?.properties).toMatchObject({
      tool: "read_page",
      status: "not_found",
      path: "/docs/not-a-page",
    });
  });

  it("reads a folder as its overview page, as the html route does", async () => {
    const { source } = await import("@/lib/source");
    const { getLLMText } = await import("@/lib/get-llm-text");
    vi.mocked(getLLMText).mockResolvedValueOnce("# AG-UI");
    vi.mocked(source.getPage).mockImplementation(((slug: string[]) =>
      slug.join("/") === "runtimes/ag-ui/overview"
        ? {
            url: "/docs/runtimes/ag-ui/overview",
            data: { title: "AG-UI" },
          }
        : undefined) as never);

    const response = await callTool("read_page", {
      path: "/docs/runtimes/ag-ui",
    });
    vi.mocked(source.getPage).mockReset();

    const text = ((await response.json()) as { result: ToolCallResult }).result
      .content[0]?.text;
    expect(JSON.parse(text ?? "{}")).toMatchObject({
      url: "/docs/runtimes/ag-ui/overview",
      content: "# AG-UI",
    });
    expect(captured()[0]?.properties).toMatchObject({
      status: "ok",
      page: "/docs/runtimes/ag-ui/overview",
    });
  });

  it("counts a throttled call apart from a failure", async () => {
    mocks.checkDocsRateLimit.mockResolvedValueOnce(
      new Response("Docs tool rate limit exceeded", { status: 429 }),
    );
    await callTool("get_navigation", {});

    expect(captured()[0]?.properties).toMatchObject({
      tool: "get_navigation",
      status: "throttled",
    });
  });

  it("records the client name a session reports, since many send a bare node user-agent", async () => {
    await postMcp(
      JSON.stringify({
        jsonrpc: "2.0",
        id: nextId++,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "Roo Code", version: "3.20.1" },
        },
      }),
      { "user-agent": "node" },
    );

    expect(captured()).toEqual([
      expect.objectContaining({
        event: "mcp_client_initialized",
        properties: expect.objectContaining({
          client_name: "Roo Code",
          client_version: "3.20.1",
          client: "node",
        }),
      }),
    ]);
  });

  it("records why the transport refused a request, without what was sent", async () => {
    const response = await postMcp("{not json");

    expect(response.status).toBe(400);
    expect(captured()).toEqual([
      expect.objectContaining({
        event: "mcp_request_rejected",
        properties: expect.objectContaining({
          status: 400,
          reason: "parse-error",
          client: "claude-code",
        }),
      }),
    ]);
  });

  it("sends nothing from an opt-in region", async () => {
    mocks.captureImmediate.mockClear();
    await POST(
      new Request(`${ORIGIN}/api/mcp`, {
        method: "POST",
        headers: { ...AGENT_HEADERS, "x-vercel-ip-country": "FR" },
        body: encoder.encode(
          JSON.stringify({
            jsonrpc: "2.0",
            id: nextId++,
            method: "tools/call",
            params: { name: "search_docs", arguments: { query: "thread" } },
          }),
        ),
      }) as Parameters<typeof POST>[0],
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mocks.captureImmediate).not.toHaveBeenCalled();
  });
});
