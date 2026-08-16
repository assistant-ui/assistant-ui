import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  McpServer,
  WebStandardStreamableHTTPServerTransport,
} from "@modelcontextprotocol/server";
import { normalizeMcpRequestHeaders } from "./normalize-mcp-headers";

const encoder = new TextEncoder();

const initializeBody = JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "sentinel-client", version: "1.0.0" },
  },
});

const makeLenientRequest = () =>
  new Request("https://example.com/api/mcp", {
    method: "POST",
    headers: { Accept: "application/json" },
    body: encoder.encode(initializeBody),
  });

describe("normalizeMcpRequestHeaders against a live transport", () => {
  let server: McpServer;
  let transport: WebStandardStreamableHTTPServerTransport;

  beforeEach(async () => {
    server = new McpServer({ name: "sentinel-server", version: "1.0.0" });
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

  it("lets a lenient request through once normalizeMcpRequestHeaders rewrites it", async () => {
    const normalized = await normalizeMcpRequestHeaders(makeLenientRequest());
    const response = await transport.handleRequest(normalized);
    expect(response.status).toBe(200);
  });

  it("rejects the same raw lenient request with 406 when the shim is skipped", async () => {
    // If this assertion fails, the SDK's Accept header gate moved and normalizeMcpRequestHeaders must be re-evaluated against the new behavior.
    const response = await transport.handleRequest(makeLenientRequest());
    expect(response.status).toBe(406);
  });

  it("rejects a form encoded Content-Type with 415", async () => {
    const request = new Request("https://example.com/api/mcp", {
      method: "POST",
      headers: {
        Accept: "application/json, text/event-stream",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: encoder.encode(initializeBody),
    });
    const response = await transport.handleRequest(request);
    expect(response.status).toBe(415);
  });
});
