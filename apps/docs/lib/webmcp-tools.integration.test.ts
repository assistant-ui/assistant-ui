import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  McpServer,
  WebStandardStreamableHTTPServerTransport,
} from "@modelcontextprotocol/server";
import { z } from "zod";
import { normalizeMcpRequestHeaders } from "@/app/api/mcp/normalize-mcp-headers";
import { mcpTransportOptions } from "@/app/api/mcp/transport-config";
import { searchDocsTool } from "@/lib/mcp-tool-definitions";
import {
  registerWebMcpTools,
  type FetchLike,
  type WebMcpModelContext,
} from "./webmcp-tools";

// The route pulls fumadocs-mdx virtual modules into Vitest, so this uses its
// shared transport config with a minimal server fixture.

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
    transport = new WebStandardStreamableHTTPServerTransport(
      mcpTransportOptions,
    );
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
