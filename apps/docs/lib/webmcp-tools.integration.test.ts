import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  McpServer,
  WebStandardStreamableHTTPServerTransport,
} from "@modelcontextprotocol/server";
import { z } from "zod";
import { normalizeMcpRequestHeaders } from "@/app/api/mcp/normalize-mcp-headers";
import { searchDocsTool } from "@/lib/mcp-tool-definitions";
import {
  registerWebMcpTools,
  type FetchLike,
  type WebMcpModelContext,
} from "./webmcp-tools";

// The docs route (app/api/mcp/route.ts) can't be imported here because it pulls
// in fumadocs-mdx virtual modules, so this rebuilds its POST handler's server +
// transport configuration instead.

function buildSearchServer() {
  const server = new McpServer({ name: "assistant-ui-docs", version: "1.0.0" });
  server.registerTool(
    searchDocsTool.name,
    {
      description: searchDocsTool.description,
      inputSchema: z.object({ query: z.string() }).strict(),
    },
    ({ query }) => ({
      content: [{ type: "text" as const, text: `results for ${query}` }],
    }),
  );
  return server;
}

describe("callMcpRoute against a live streamable-HTTP transport", () => {
  let server: McpServer;
  let transport: WebStandardStreamableHTTPServerTransport;
  let responseContentType: string | null;

  beforeEach(async () => {
    responseContentType = null;
    server = buildSearchServer();
    transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    await server.connect(transport);
  });

  afterEach(async () => {
    await transport.close().catch(() => {});
    await server.close().catch(() => {});
  });

  const transportFetch: FetchLike = async (url, init) => {
    const request = new Request(new URL(url, "https://example.com"), {
      method: init.method,
      headers: init.headers,
      body: init.body,
      ...(init.signal ? { signal: init.signal } : {}),
    });
    const response = await transport.handleRequest(
      await normalizeMcpRequestHeaders(request),
    );
    responseContentType = response.headers.get("content-type");
    return response;
  };

  function registeredSearchDocsTool() {
    const tools: Parameters<WebMcpModelContext["registerTool"]>[0][] = [];
    registerWebMcpTools(
      {
        registerTool: (tool) => {
          tools.push(tool);
          return Promise.resolve();
        },
      },
      transportFetch,
    );
    const tool = tools.find((t) => t.name === "searchDocs");
    if (!tool) throw new Error("missing searchDocs tool");
    return tool;
  }

  it("accepts a bare tools/call with no initialize handshake", async () => {
    const result = await registeredSearchDocsTool().execute({ query: "tools" });

    expect(result).toEqual({
      content: [{ type: "text", text: "results for tools" }],
    });
    expect(responseContentType).toContain("application/json");
  });
});
