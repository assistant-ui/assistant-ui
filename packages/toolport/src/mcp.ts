import { callTool, listTools, ToolError } from "./toolkit";
import type { Toolkit } from "./types";

export const MCP_PROTOCOL_VERSION = "2025-06-18";

export type JsonRpcId = string | number | null;

export type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: JsonRpcId;
  method: string;
  params?: unknown;
};

export type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;
const INTERNAL_ERROR = -32603;

const respond = (id: JsonRpcId, result: unknown): JsonRpcResponse => ({
  jsonrpc: "2.0",
  id,
  result,
});
const fail = (
  id: JsonRpcId,
  code: number,
  message: string,
): JsonRpcResponse => ({
  jsonrpc: "2.0",
  id,
  error: { code, message },
});

const toContent = (result: unknown) => [
  {
    type: "text",
    text: typeof result === "string" ? result : JSON.stringify(result),
  },
];

export const handleMcpMessage = async (
  toolkit: Toolkit,
  message: JsonRpcRequest,
): Promise<JsonRpcResponse | null> => {
  const id = message.id ?? null;
  const isNotification = message.id === undefined;
  switch (message.method) {
    case "initialize":
      return respond(id, {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: toolkit.name, version: toolkit.version ?? "0.0.0" },
        ...(toolkit.description ? { instructions: toolkit.description } : {}),
      });
    case "ping":
      return respond(id, {});
    case "tools/list":
      return respond(id, { tools: listTools(toolkit) });
    case "tools/call": {
      const params = (message.params ?? {}) as {
        name?: unknown;
        arguments?: unknown;
      };
      if (typeof params.name !== "string")
        return fail(id, INVALID_PARAMS, "tools/call requires a name");
      try {
        const result = await callTool(
          toolkit,
          params.name,
          params.arguments ?? {},
        );
        const structured =
          typeof result === "object" &&
          result !== null &&
          !Array.isArray(result)
            ? { structuredContent: result }
            : {};
        return respond(id, {
          content: toContent(result),
          ...structured,
          isError: false,
        });
      } catch (error) {
        if (error instanceof ToolError && error.code === "unknown_tool") {
          return fail(id, INVALID_PARAMS, error.message);
        }
        const text = error instanceof Error ? error.message : String(error);
        return respond(id, {
          content: [{ type: "text", text }],
          isError: true,
        });
      }
    }
    default:
      if (isNotification) return null;
      return fail(id, METHOD_NOT_FOUND, `method not found: ${message.method}`);
  }
};

export const createMcpFetchHandler =
  (toolkit: Toolkit) =>
  async (request: Request): Promise<Response> => {
    if (request.method !== "POST") {
      return new Response("method not allowed", {
        status: 405,
        headers: { allow: "POST" },
      });
    }
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json(fail(null, -32700, "parse error"), { status: 400 });
    }
    const messages = Array.isArray(body) ? body : [body];
    const responses = (
      await Promise.all(
        messages.map((message) =>
          handleMcpMessage(toolkit, message as JsonRpcRequest),
        ),
      )
    ).filter((response): response is JsonRpcResponse => response !== null);
    if (responses.length === 0) return new Response(null, { status: 202 });
    return Response.json(Array.isArray(body) ? responses : responses[0]);
  };

export type McpStdioIo = {
  readonly input: AsyncIterable<string | Uint8Array>;
  readonly write: (line: string) => void;
};

export const serveMcpStdio = async (
  toolkit: Toolkit,
  io?: McpStdioIo,
): Promise<void> => {
  const process = io
    ? undefined
    : await import("node:process").then((m) => m.default);
  const input = io?.input ?? process!.stdin;
  const write =
    io?.write ?? ((line: string) => process!.stdout.write(line + "\n"));
  const decoder = new TextDecoder();
  let buffer = "";
  for await (const chunk of input) {
    buffer +=
      typeof chunk === "string"
        ? chunk
        : decoder.decode(chunk, { stream: true });
    let newline = buffer.indexOf("\n");
    while (newline !== -1) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      newline = buffer.indexOf("\n");
      if (line.length === 0) continue;
      let message: JsonRpcRequest;
      try {
        message = JSON.parse(line);
      } catch {
        write(JSON.stringify(fail(null, -32700, "parse error")));
        continue;
      }
      const response = await handleMcpMessage(toolkit, message).catch((error) =>
        fail(
          message.id ?? null,
          INTERNAL_ERROR,
          error instanceof Error ? error.message : String(error),
        ),
      );
      if (response) write(JSON.stringify(response));
    }
  }
};
