export type JsonRpcId = string | number;

export type JsonRpcRequest = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  method: string;
  params?: unknown;
};

export type JsonRpcNotification = {
  jsonrpc: "2.0";
  method: string;
  params?: unknown;
};

export type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

export type JsonRpcMessage =
  | JsonRpcRequest
  | JsonRpcNotification
  | JsonRpcResponse;

export const RPC_ERROR = {
  parseError: -32700,
  invalidRequest: -32600,
  methodNotFound: -32601,
  invalidParams: -32602,
  internalError: -32603,
} as const;

export class RpcError extends Error {
  readonly code: number;
  readonly data: unknown;

  constructor(code: number, message: string, data?: unknown) {
    super(message);
    this.name = "RpcError";
    this.code = code;
    this.data = data;
  }
}

/** The subset of `MessagePort` the peer uses. */
export type RpcEndpoint = {
  postMessage(message: unknown): void;
  addEventListener(
    type: "message",
    listener: (event: MessageEvent) => void,
  ): void;
  removeEventListener(
    type: "message",
    listener: (event: MessageEvent) => void,
  ): void;
  start?(): void;
};

export type RpcHandlers = {
  /** Resolves to the result; throw an `RpcError` to answer with a specific code. */
  onRequest?: (method: string, params: unknown) => unknown;
  onNotification?: (method: string, params: unknown) => void;
};

export type RpcPeer = {
  request(
    method: string,
    params?: unknown,
    options?: { timeoutMs?: number },
  ): Promise<unknown>;
  notify(method: string, params?: unknown): void;
  /** Feeds a message received outside the endpoint, such as a window message. */
  receive(message: unknown, reply?: (message: JsonRpcMessage) => void): void;
  dispose(): void;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export function isJsonRpcMessage(value: unknown): value is JsonRpcMessage {
  return isRecord(value) && value["jsonrpc"] === "2.0";
}

const errorPayload = (error: unknown) => {
  if (error instanceof RpcError) {
    return {
      code: error.code,
      message: error.message,
      ...(error.data !== undefined ? { data: error.data } : {}),
    };
  }
  return {
    code: RPC_ERROR.internalError,
    message: error instanceof Error ? error.message : String(error),
  };
};

/** A symmetric JSON-RPC 2.0 peer: both sides can send requests and notifications. */
export function createRpcPeer(
  endpoint: RpcEndpoint,
  handlers: RpcHandlers = {},
): RpcPeer {
  let nextId = 1;
  let disposed = false;
  const pending = new Map<
    JsonRpcId,
    {
      resolve: (value: unknown) => void;
      reject: (error: unknown) => void;
      timer: ReturnType<typeof setTimeout> | undefined;
    }
  >();

  const post = (message: JsonRpcMessage) => {
    if (disposed) return;
    endpoint.postMessage(message);
  };

  const handleRequest = async (
    request: JsonRpcRequest,
    reply: (message: JsonRpcMessage) => void,
  ) => {
    try {
      if (!handlers.onRequest) {
        throw new RpcError(
          RPC_ERROR.methodNotFound,
          `Unknown method: ${request.method}`,
        );
      }
      const result = await handlers.onRequest(request.method, request.params);
      reply({ jsonrpc: "2.0", id: request.id, result: result ?? null });
    } catch (error) {
      reply({ jsonrpc: "2.0", id: request.id, error: errorPayload(error) });
    }
  };

  const receive = (
    message: unknown,
    reply: (message: JsonRpcMessage) => void = post,
  ) => {
    if (disposed || !isJsonRpcMessage(message)) return;
    const hasId =
      "id" in message &&
      (typeof message.id === "string" || typeof message.id === "number");

    if ("method" in message && typeof message.method === "string") {
      if (hasId) {
        void handleRequest(message as JsonRpcRequest, reply);
      } else {
        try {
          handlers.onNotification?.(message.method, message.params);
        } catch {
          // A failing notification handler has nobody to answer to.
        }
      }
      return;
    }

    if (!hasId) return;
    const response = message as JsonRpcResponse;
    const entry = pending.get(response.id);
    if (!entry) return;
    pending.delete(response.id);
    if (entry.timer !== undefined) clearTimeout(entry.timer);
    if (response.error) {
      entry.reject(
        new RpcError(
          response.error.code,
          response.error.message,
          response.error.data,
        ),
      );
    } else {
      entry.resolve(response.result);
    }
  };

  const onMessage = (event: MessageEvent) => receive(event.data);
  endpoint.addEventListener("message", onMessage);
  endpoint.start?.();

  return {
    request(method, params, options) {
      if (disposed) {
        return Promise.reject(new Error("RPC peer is disposed"));
      }
      const id = nextId++;
      return new Promise((resolve, reject) => {
        const timeoutMs = options?.timeoutMs;
        const timer =
          timeoutMs === undefined
            ? undefined
            : setTimeout(() => {
                pending.delete(id);
                reject(new Error(`${method} timed out after ${timeoutMs}ms`));
              }, timeoutMs);
        pending.set(id, { resolve, reject, timer });
        post({
          jsonrpc: "2.0",
          id,
          method,
          ...(params !== undefined ? { params } : {}),
        });
      });
    },
    notify(method, params) {
      post({
        jsonrpc: "2.0",
        method,
        ...(params !== undefined ? { params } : {}),
      });
    },
    receive,
    dispose() {
      if (disposed) return;
      disposed = true;
      endpoint.removeEventListener("message", onMessage);
      for (const entry of pending.values()) {
        if (entry.timer !== undefined) clearTimeout(entry.timer);
        entry.reject(new Error("RPC peer is disposed"));
      }
      pending.clear();
    },
  };
}
