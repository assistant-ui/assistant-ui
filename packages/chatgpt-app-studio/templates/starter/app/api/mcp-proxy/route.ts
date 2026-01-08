import { NextResponse } from "next/server";

interface McpError {
  type:
    | "connection_refused"
    | "timeout"
    | "not_found"
    | "invalid_response"
    | "tool_error"
    | "server_error"
    | "unknown";
  message: string;
  suggestion: string;
  details?: string;
}

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

const sessionCache = new Map<string, { sessionId: string; lastUsed: number }>();

const SESSION_TTL = 5 * 60 * 1000; // 5 minutes

function getOrCreateSession(serverUrl: string): string | undefined {
  const cached = sessionCache.get(serverUrl);
  if (cached && Date.now() - cached.lastUsed < SESSION_TTL) {
    cached.lastUsed = Date.now();
    return cached.sessionId;
  }
  return undefined;
}

function cacheSession(serverUrl: string, sessionId: string): void {
  sessionCache.set(serverUrl, { sessionId, lastUsed: Date.now() });
}

function clearSession(serverUrl: string): void {
  sessionCache.delete(serverUrl);
}

async function mcpRequest(
  serverUrl: string,
  method: string,
  params?: Record<string, unknown>,
  sessionId?: string,
): Promise<{ result?: unknown; error?: McpError; sessionId?: string }> {
  const request: JsonRpcRequest = {
    jsonrpc: "2.0",
    id: Date.now(),
    method,
    params,
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };

  if (sessionId) {
    headers["Mcp-Session-Id"] = sessionId;
  }

  const response = await fetch(serverUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(30000),
  });

  const newSessionId = response.headers.get("Mcp-Session-Id") || undefined;

  if (!response.ok) {
    const text = await response.text().catch(() => "Unknown error");
    return {
      error: {
        type: response.status === 404 ? "not_found" : "server_error",
        message: `HTTP ${response.status}: ${text}`,
        suggestion:
          response.status === 404
            ? "MCP endpoint not found. Check the server URL."
            : "Server error. Check the server logs.",
      },
      sessionId: newSessionId,
    };
  }

  const data = (await response.json()) as JsonRpcResponse;

  if (data.error) {
    return {
      error: {
        type: "tool_error",
        message: data.error.message,
        suggestion: "Check the tool handler implementation.",
        details: JSON.stringify(data.error.data),
      },
      sessionId: newSessionId,
    };
  }

  return { result: data.result, sessionId: newSessionId };
}

async function initializeSession(
  serverUrl: string,
): Promise<{ sessionId?: string; error?: McpError }> {
  const { error, sessionId } = await mcpRequest(serverUrl, "initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: {
      name: "chatgpt-app-workbench",
      version: "1.0.0",
    },
  });

  if (error) {
    return { error };
  }

  if (sessionId) {
    cacheSession(serverUrl, sessionId);
  }

  return { sessionId };
}

function validateAndConstructUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const allowedHosts = ["localhost", "127.0.0.1", "[::1]"] as const;
    const matchedHost = allowedHosts.find((h) => h === parsed.hostname);
    if (!matchedHost) {
      return null;
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    const safeProtocol = parsed.protocol === "https:" ? "https:" : "http:";
    const safePort = parsed.port ? `:${parseInt(parsed.port, 10)}` : "";
    return `${safeProtocol}//${matchedHost}${safePort}${parsed.pathname}${parsed.search}`;
  } catch {
    return null;
  }
}

async function handleToolsList(body: { serverUrl: string }): Promise<Response> {
  const validatedUrl = validateAndConstructUrl(body.serverUrl);
  if (!validatedUrl) {
    return NextResponse.json(
      {
        error: {
          type: "server_error",
          message: "MCP proxy only allows localhost URLs for security reasons.",
          suggestion: "Use a localhost URL (e.g., http://localhost:3001/mcp).",
        },
      },
      { status: 403 },
    );
  }

  let sessionId = getOrCreateSession(validatedUrl);

  if (!sessionId) {
    const initResult = await initializeSession(validatedUrl);
    if (initResult.error) {
      return NextResponse.json({ error: initResult.error });
    }
    sessionId = initResult.sessionId;
  }

  const {
    result,
    error,
    sessionId: newSessionId,
  } = await mcpRequest(validatedUrl, "tools/list", {}, sessionId);

  if (newSessionId && newSessionId !== sessionId) {
    cacheSession(validatedUrl, newSessionId);
  }

  if (error) {
    return NextResponse.json({ error });
  }

  return NextResponse.json({ result });
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      {
        error: {
          type: "server_error",
          message: "MCP proxy is only available in development mode.",
          suggestion: "Deploy your MCP server separately for production.",
        },
      },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const { serverUrl, method } = body;

    if (!serverUrl) {
      return NextResponse.json(
        {
          error: {
            type: "invalid_response",
            message: "Missing serverUrl",
            suggestion: "Check the request parameters.",
          },
        },
        { status: 400 },
      );
    }

    if (method === "tools/list") {
      return handleToolsList(body);
    }

    const { tool, args } = body;
    if (!tool) {
      return NextResponse.json(
        {
          error: {
            type: "invalid_response",
            message: "Missing tool",
            suggestion: "Check the request parameters.",
          },
        },
        { status: 400 },
      );
    }

    const validatedUrl = validateAndConstructUrl(serverUrl);
    if (!validatedUrl) {
      return NextResponse.json(
        {
          error: {
            type: "server_error",
            message:
              "MCP proxy only allows localhost URLs for security reasons.",
            suggestion:
              "Use a localhost URL (e.g., http://localhost:3001/mcp).",
          },
        },
        { status: 403 },
      );
    }

    let sessionId = getOrCreateSession(validatedUrl);

    if (!sessionId) {
      const initResult = await initializeSession(validatedUrl);
      if (initResult.error) {
        return NextResponse.json({ error: initResult.error });
      }
      sessionId = initResult.sessionId;
    }

    const {
      result,
      error,
      sessionId: newSessionId,
    } = await mcpRequest(
      validatedUrl,
      "tools/call",
      {
        name: tool,
        arguments: args || {},
      },
      sessionId,
    );

    if (newSessionId && newSessionId !== sessionId) {
      cacheSession(validatedUrl, newSessionId);
    }

    if (error) {
      if (
        error.type === "tool_error" &&
        error.message?.includes("not initialized")
      ) {
        clearSession(validatedUrl);
        const retryInit = await initializeSession(validatedUrl);
        if (!retryInit.error) {
          const retryResult = await mcpRequest(
            validatedUrl,
            "tools/call",
            { name: tool, arguments: args || {} },
            retryInit.sessionId,
          );
          if (!retryResult.error) {
            return NextResponse.json({ result: retryResult.result });
          }
        }
      }
      return NextResponse.json({ error });
    }

    return NextResponse.json({ result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";

    let errorType: McpError["type"] = "unknown";
    let suggestion = "Check the server logs for details.";

    if (message.includes("fetch") || message.includes("ECONNREFUSED")) {
      errorType = "connection_refused";
      suggestion =
        "MCP server is not running.\n\nRun: cd server && npm run dev";
    } else if (message.includes("timeout") || message.includes("AbortError")) {
      errorType = "timeout";
      suggestion = "Server took too long. Check server logs.";
    }

    return NextResponse.json({
      error: {
        type: errorType,
        message,
        suggestion,
      },
    });
  }
}
