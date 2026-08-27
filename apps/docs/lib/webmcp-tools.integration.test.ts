import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  McpServer,
  WebStandardStreamableHTTPServerTransport,
} from "@modelcontextprotocol/server";
import { z } from "zod";
import { normalizeMcpRequestHeaders } from "@/app/api/mcp/normalize-mcp-headers";
import { searchDocsTool } from "@/app/api/mcp/tool-definitions";
import {
  registerWebMcpTools,
  type FetchLike,
  type WebMcpModelContext,
} from "./webmcp-tools";

// The docs route (app/api/mcp/route.ts) can't be imported here because it
// pulls in fumadocs-mdx virtual modules, so this drives a server + transport
// configured exactly like the route's POST handler: stateless (no session id),
// enableJsonResponse, request normalized through normalizeMcpRequestHeaders.
// The requests come from the real callMcpRoute code path via registerWebMcpTools,
// and the fixture registers its tool from the same tool-definitions module the
// route imports, which locks in the transport contract: a bare tools/call with
// no initialize handshake is accepted, and the transport answers with a JSON
// body (not SSE) despite the client's "application/json, text/event-stream"
// Accept header.

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

  beforeEach(async () => {
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
    return transport.handleRequest(await normalizeMcpRequestHeaders(request));
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

    expect(result.isError).toBeUndefined();
    expect(result.content).toEqual([
      { type: "text", text: "results for tools" },
    ]);
  });

  it("answers with a parseable JSON body despite the SSE Accept header", async () => {
    const response = await transportFetch("/api/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: searchDocsTool.name, arguments: { query: "x" } },
      }),
    });

    expect(response.ok).toBe(true);
    expect((response as Response).headers.get("content-type")).toContain(
      "application/json",
    );
    const payload = (await response.json()) as {
      result?: { content?: unknown };
    };
    expect(Array.isArray(payload.result?.content)).toBe(true);
  });
});
