import {
  StreamableHTTPClientTransport,
  isInitializeRequest,
  isJSONRPCRequest,
  isJSONRPCResultResponse,
} from "@modelcontextprotocol/client";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import type { Readable, Writable } from "node:stream";

const DEFAULT_URL = "https://www.assistant-ui.com/mcp";

const logError = (message: string, error: unknown) => {
  console.error(`assistant-ui MCP proxy: ${message}`, error);
};

export async function runProxy({
  url = new URL(process.env.ASSISTANT_UI_MCP_URL ?? DEFAULT_URL),
  stdin = process.stdin,
  stdout = process.stdout,
}: {
  url?: URL;
  stdin?: NodeJS.ReadableStream;
  stdout?: NodeJS.WritableStream;
} = {}) {
  const stdio = new StdioServerTransport(stdin as Readable, stdout as Writable);
  const http = new StreamableHTTPClientTransport(url);
  let initializeRequestId: string | number | undefined;
  let closing = false;
  let resolveClosed = () => {};
  const closed = new Promise<void>((resolve) => {
    resolveClosed = resolve;
  });

  const closeCounterpart = (counterpart: { close(): Promise<void> }) => {
    if (closing) return;
    closing = true;
    void counterpart
      .close()
      .catch((error: unknown) => {
        logError("failed to close transport", error);
      })
      .then(resolveClosed);
  };

  stdio.onmessage = (message) => {
    if (isInitializeRequest(message)) {
      initializeRequestId = message.id;
    }

    void http.send(message).catch(async (error: unknown) => {
      logError("failed to forward message to hosted endpoint", error);
      if (!isJSONRPCRequest(message)) return;

      await stdio
        .send({
          jsonrpc: "2.0",
          id: message.id,
          error: {
            code: -32603,
            message: "Failed to proxy request to the hosted MCP server",
          },
        })
        .catch((sendError: unknown) => {
          logError("failed to return proxy error response", sendError);
        });
    });
  };

  http.onmessage = (message) => {
    if (
      isJSONRPCResultResponse(message) &&
      message.id === initializeRequestId
    ) {
      const protocolVersion = (
        message.result as { protocolVersion?: unknown } | null
      )?.protocolVersion;
      if (typeof protocolVersion === "string") {
        http.setProtocolVersion(protocolVersion);
      }
    }

    void stdio.send(message).catch((error: unknown) => {
      logError("failed to forward message to stdio", error);
    });
  };

  stdio.onerror = (error) => {
    logError("stdio transport error", error);
  };
  http.onerror = (error) => {
    logError("HTTP transport error", error);
  };
  stdio.onclose = () => {
    closeCounterpart(http);
  };
  http.onclose = () => {
    closeCounterpart(stdio);
  };

  try {
    await http.start();
    await stdio.start();
  } catch (error) {
    closing = true;
    await Promise.allSettled([http.close(), stdio.close()]);
    resolveClosed();
    throw error;
  }

  await closed;
}
