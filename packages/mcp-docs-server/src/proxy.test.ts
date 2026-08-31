import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { PassThrough } from "node:stream";
import {
  McpServer,
  WebStandardStreamableHTTPServerTransport,
  fromJsonSchema,
} from "@modelcontextprotocol/server";
import { runProxy } from "./proxy.js";

type RpcResponse = {
  jsonrpc: "2.0";
  id: number;
  result?: Record<string, unknown>;
  error?: {
    code: number;
    message: string;
  };
};

const toWebRequest = async (request: IncomingMessage) => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) headers.append(name, item);
    } else if (value !== undefined) {
      headers.set(name, value);
    }
  }

  const init: RequestInit = {
    method: request.method ?? "GET",
    headers,
  };
  if (chunks.length > 0) {
    init.body = Buffer.concat(chunks);
  }

  return new Request(new URL(request.url ?? "/", "http://127.0.0.1"), init);
};

const writeWebResponse = async (response: Response, output: ServerResponse) => {
  output.statusCode = response.status;
  response.headers.forEach((value, name) => {
    output.setHeader(name, value);
  });
  output.end(Buffer.from(await response.arrayBuffer()));
};

const listen = (server: ReturnType<typeof createServer>) =>
  new Promise<URL>((resolve, reject) => {
    const onError = (error: Error) => {
      reject(error);
    };
    server.once("error", onError);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", onError);
      const address = server.address();
      if (address === null || typeof address === "string") {
        reject(new Error("HTTP server did not bind to a TCP port"));
        return;
      }
      resolve(new URL(`http://127.0.0.1:${address.port}/mcp`));
    });
  });

const closeHttpServer = (server: ReturnType<typeof createServer>) =>
  new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
    server.closeAllConnections();
  });

const withTimeout = <T>(promise: Promise<T>, label: string) =>
  new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timed out waiting for ${label}`));
    }, 2_000);
    void promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });

const createRpcClient = (stdin: PassThrough, stdout: PassThrough) => {
  let nextId = 1;
  let buffer = "";
  const pending = new Map<
    number,
    {
      resolve(response: RpcResponse): void;
      reject(error: Error): void;
      timeout: ReturnType<typeof setTimeout>;
    }
  >();

  stdout.on("data", (chunk: Buffer) => {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.length === 0) continue;
      const response = JSON.parse(line) as RpcResponse;
      const request = pending.get(response.id);
      if (!request) continue;
      clearTimeout(request.timeout);
      pending.delete(response.id);
      request.resolve(response);
    }
  });

  return {
    request(method: string, params: Record<string, unknown>) {
      const id = nextId++;
      return new Promise<RpcResponse>((resolve, reject) => {
        const timeout = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`Timed out waiting for ${method}`));
        }, 2_000);
        pending.set(id, { resolve, reject, timeout });
        stdin.write(
          `${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`,
        );
      });
    },
    notify(method: string) {
      stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method })}\n`);
    },
  };
};

describe("runProxy", () => {
  it("proxies MCP requests and returns transport failures", async () => {
    const inputSchema = fromJsonSchema<{ text: string }>({
      type: "object",
      properties: {
        text: { type: "string" },
      },
      required: ["text"],
      additionalProperties: false,
    });
    const mcpServer = new McpServer({ name: "proxy-test", version: "1.0.0" });
    mcpServer.registerTool(
      "echo",
      { description: "Echo text", inputSchema },
      ({ text }) => ({ content: [{ type: "text", text }] }),
    );
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    let resolveInitialized = () => {};
    const initialized = new Promise<void>((resolve) => {
      resolveInitialized = resolve;
    });
    mcpServer.server.oninitialized = resolveInitialized;
    await mcpServer.connect(transport);

    const httpServer = createServer((request, response) => {
      void (async () => {
        const webRequest = await toWebRequest(request);
        const webResponse =
          webRequest.method === "GET"
            ? Response.json({
                name: "assistant-ui",
                transport: "streamable-http",
              })
            : await transport.handleRequest(webRequest);
        await writeWebResponse(webResponse, response);
      })().catch((error: unknown) => {
        response.statusCode = 500;
        response.end(error instanceof Error ? error.message : String(error));
      });
    });
    const url = await listen(httpServer);
    const proxyStdin = new PassThrough();
    const proxyStdout = new PassThrough();
    const stderr = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const proxy = runProxy({ url, stdin: proxyStdin, stdout: proxyStdout });
    const client = createRpcClient(proxyStdin, proxyStdout);
    let httpServerClosed = false;

    try {
      const initialize = await client.request("initialize", {
        protocolVersion: "2025-11-25",
        capabilities: {},
        clientInfo: { name: "proxy-test-client", version: "1.0.0" },
      });
      expect(initialize.error).toBeUndefined();
      expect(initialize.result).toMatchObject({
        protocolVersion: "2025-11-25",
        serverInfo: { name: "proxy-test", version: "1.0.0" },
      });

      client.notify("notifications/initialized");
      await withTimeout(initialized, "initialized notification");

      const tools = await client.request("tools/list", {});
      expect(tools.error).toBeUndefined();
      expect(tools.result?.tools).toContainEqual(
        expect.objectContaining({ name: "echo" }),
      );

      const call = await client.request("tools/call", {
        name: "echo",
        arguments: { text: "hello through the proxy" },
      });
      expect(call.error).toBeUndefined();
      expect(call.result?.content).toEqual([
        { type: "text", text: "hello through the proxy" },
      ]);

      await closeHttpServer(httpServer);
      httpServerClosed = true;

      const failure = await client.request("tools/list", {});
      expect(failure.error).toEqual({
        code: -32603,
        message: "Failed to proxy request to the hosted MCP server",
      });
      expect(stderr).toHaveBeenCalled();
    } finally {
      if (!httpServerClosed) await closeHttpServer(httpServer);
      proxyStdout.destroy(new Error("Proxy test cleanup"));
      await proxy;
      proxyStdin.destroy();
      await mcpServer.close();
      stderr.mockRestore();
    }
  });
});
