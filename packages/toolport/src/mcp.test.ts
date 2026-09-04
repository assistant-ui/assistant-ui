import { describe, expect, it } from "vitest";
import { weather } from "./__tests__/weather";
import {
  createMcpFetchHandler,
  handleMcpMessage,
  MCP_PROTOCOL_VERSION,
  serveMcpStdio,
} from "./mcp";

describe("handleMcpMessage", () => {
  it("answers initialize with server info", async () => {
    await expect(
      handleMcpMessage(weather, {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
      }),
    ).resolves.toEqual({
      jsonrpc: "2.0",
      id: 1,
      result: {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: "weather", version: "1.2.3" },
        instructions: "Weather lookups.",
      },
    });
  });

  it("lists tools", async () => {
    const response = await handleMcpMessage(weather, {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
    });
    expect(response?.result).toMatchObject({
      tools: [{ name: "getWeather" }, { name: "fail" }],
    });
  });

  it("calls a tool and returns text plus structured content", async () => {
    const response = await handleMcpMessage(weather, {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "getWeather", arguments: { location: "Berlin" } },
    });
    expect(response?.result).toMatchObject({
      isError: false,
      structuredContent: { location: "Berlin" },
      content: [{ type: "text" }],
    });
  });

  it("maps tool failures to isError results and unknown tools to invalid params", async () => {
    const failed = await handleMcpMessage(weather, {
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: { name: "fail", arguments: {} },
    });
    expect(failed?.result).toMatchObject({
      isError: true,
      content: [{ text: "boom" }],
    });
    const unknown = await handleMcpMessage(weather, {
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: { name: "nope" },
    });
    expect(unknown?.error?.code).toBe(-32602);
  });

  it("ignores notifications and rejects unknown methods", async () => {
    await expect(
      handleMcpMessage(weather, {
        jsonrpc: "2.0",
        method: "notifications/initialized",
      }),
    ).resolves.toBeNull();
    const response = await handleMcpMessage(weather, {
      jsonrpc: "2.0",
      id: 6,
      method: "resources/list",
    });
    expect(response?.error?.code).toBe(-32601);
  });
});

describe("createMcpFetchHandler", () => {
  const handler = createMcpFetchHandler(weather);
  const post = (body: unknown) =>
    handler(
      new Request("http://localhost/mcp", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    );

  it("serves single requests and batches", async () => {
    const single = await post({ jsonrpc: "2.0", id: 1, method: "ping" });
    expect(await single.json()).toEqual({ jsonrpc: "2.0", id: 1, result: {} });
    const batch = await post([
      { jsonrpc: "2.0", id: 1, method: "ping" },
      { jsonrpc: "2.0", method: "notifications/initialized" },
    ]);
    expect(await batch.json()).toHaveLength(1);
  });

  it("returns 202 for notification-only bodies and 405 for GET", async () => {
    expect(
      (await post({ jsonrpc: "2.0", method: "notifications/initialized" }))
        .status,
    ).toBe(202);
    expect((await handler(new Request("http://localhost/mcp"))).status).toBe(
      405,
    );
  });
});

describe("serveMcpStdio", () => {
  it("answers newline-delimited JSON-RPC over an async input", async () => {
    const lines: string[] = [];
    async function* input() {
      yield '{"jsonrpc":"2.0","id":1,"method":"ping"}\n{"jsonrpc":"2.0","method":"notifications/initialized"}\n';
      yield "not json\n";
      yield new TextEncoder().encode(
        '{"jsonrpc":"2.0","id":2,"method":"tools/list"}\n',
      );
    }
    await serveMcpStdio(weather, {
      input: input(),
      write: (line) => lines.push(line),
    });
    expect(lines.map((line) => JSON.parse(line))).toMatchObject([
      { id: 1, result: {} },
      { id: null, error: { code: -32700 } },
      { id: 2, result: { tools: [{ name: "getWeather" }, { name: "fail" }] } },
    ]);
  });
});
