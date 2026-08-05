import {
  InMemoryTransport,
  type McpServer,
} from "@modelcontextprotocol/server";

type RawMcpRequest = {
  method: string;
  params?: unknown;
};

type JsonRpcResponse = {
  id: number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
  };
};

type PendingRequest = {
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
};

export type McpTestClient = {
  initialize: () => Promise<unknown>;
  request: <Result>(request: RawMcpRequest) => Promise<Result>;
  close: () => Promise<void>;
};

function isJsonRpcResponse(message: unknown): message is JsonRpcResponse {
  return (
    typeof message === "object" &&
    message !== null &&
    "id" in message &&
    typeof message.id === "number" &&
    ("result" in message || "error" in message)
  );
}

export async function createMcpTestClient(
  server: McpServer,
): Promise<McpTestClient> {
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const pendingRequests = new Map<number, PendingRequest>();
  let nextRequestId = 1;

  clientTransport.onmessage = (message) => {
    if (!isJsonRpcResponse(message)) return;

    const pendingRequest = pendingRequests.get(message.id);
    if (!pendingRequest) return;

    pendingRequests.delete(message.id);
    if (message.error) {
      pendingRequest.reject(
        new Error(
          `MCP request failed (${message.error.code}): ${message.error.message}`,
        ),
      );
      return;
    }

    pendingRequest.resolve(message.result);
  };

  await clientTransport.start();
  await server.connect(serverTransport);

  const request = <Result>(rawRequest: RawMcpRequest): Promise<Result> => {
    const id = nextRequestId++;

    return new Promise((resolve, reject) => {
      pendingRequests.set(id, { resolve, reject });
      void clientTransport
        .send({ jsonrpc: "2.0", id, ...rawRequest })
        .catch((error: unknown) => {
          pendingRequests.delete(id);
          reject(error instanceof Error ? error : new Error(String(error)));
        });
    }) as Promise<Result>;
  };

  return {
    initialize: async () => {
      const result = await request({
        method: "initialize",
        params: {
          protocolVersion: "2025-11-25",
          capabilities: {},
          clientInfo: {
            name: "mcp-docs-server-tests",
            version: "1.0.0",
          },
        },
      });

      await clientTransport.send({
        jsonrpc: "2.0",
        method: "notifications/initialized",
      });

      return result;
    },
    request,
    close: async () => {
      await clientTransport.close();
    },
  };
}
