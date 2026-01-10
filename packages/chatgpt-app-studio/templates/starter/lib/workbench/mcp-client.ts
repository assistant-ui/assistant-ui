export interface McpToolCallRequest {
  tool: string;
  args: Record<string, unknown>;
  serverUrl: string;
}

export interface McpToolCallResponse {
  success: boolean;
  result?: {
    content?: Array<{ type: string; text?: string }>;
    structuredContent?: Record<string, unknown>;
    _meta?: Record<string, unknown>;
    isError?: boolean;
  };
  error?: McpError;
  duration: number;
}

export interface McpError {
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

const ERROR_SUGGESTIONS: Record<McpError["type"], string> = {
  connection_refused:
    "MCP server is not running.\n\nRun: cd server && npm run dev",
  timeout: "Server took too long to respond.\n\nCheck server logs for errors.",
  not_found:
    "MCP endpoint not found.\n\nVerify the server URL is correct and the server is running.",
  invalid_response:
    "Server returned an invalid response.\n\nCheck the tool handler returns the correct format.",
  tool_error:
    "Tool execution failed.\n\nCheck the server console for the error details.",
  server_error:
    "Server encountered an error.\n\nCheck the server console for the stack trace.",
  unknown:
    "An unexpected error occurred.\n\nCheck the server logs for details.",
};

function categorizeError(
  error: unknown,
  responseStatus?: number,
): McpError["type"] {
  if (error instanceof TypeError && String(error).includes("fetch")) {
    return "connection_refused";
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return "timeout";
  }

  if (responseStatus === 404) {
    return "not_found";
  }

  if (responseStatus && responseStatus >= 500) {
    return "server_error";
  }

  return "unknown";
}

export function createMcpError(
  type: McpError["type"],
  message: string,
  details?: string,
): McpError {
  return {
    type,
    message,
    suggestion: ERROR_SUGGESTIONS[type],
    details,
  };
}

export async function callMcpTool(
  request: McpToolCallRequest,
): Promise<McpToolCallResponse> {
  const startTime = performance.now();

  try {
    const response = await fetch("/api/mcp-proxy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    const duration = performance.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      const errorType = categorizeError(null, response.status);

      return {
        success: false,
        error: createMcpError(errorType, errorText),
        duration,
      };
    }

    const data = await response.json();

    if (data.error) {
      return {
        success: false,
        error: data.error as McpError,
        duration,
      };
    }

    return {
      success: true,
      result: data.result,
      duration,
    };
  } catch (error) {
    const duration = performance.now() - startTime;
    const errorType = categorizeError(error);
    const message =
      error instanceof Error ? error.message : "Failed to call MCP server";

    return {
      success: false,
      error: createMcpError(errorType, message),
      duration,
    };
  }
}

export interface McpToolDefinition {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface McpToolsListResponse {
  success: boolean;
  tools?: McpToolDefinition[];
  error?: McpError;
}

export async function fetchMcpTools(
  serverUrl: string,
): Promise<McpToolsListResponse> {
  try {
    const response = await fetch("/api/mcp-proxy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        method: "tools/list",
        serverUrl,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      const errorType =
        response.status === 404
          ? "not_found"
          : response.status >= 500
            ? "server_error"
            : "unknown";
      return {
        success: false,
        error: createMcpError(errorType, errorText),
      };
    }

    const data = await response.json();

    if (data.error) {
      return {
        success: false,
        error: data.error as McpError,
      };
    }

    const tools = data.result?.tools ?? [];
    return {
      success: true,
      tools,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch tools";
    const errorType =
      error instanceof TypeError && String(error).includes("fetch")
        ? "connection_refused"
        : "unknown";
    return {
      success: false,
      error: createMcpError(errorType, message),
    };
  }
}

export async function checkMcpServerHealth(
  serverUrl: string,
): Promise<{ healthy: boolean; error?: string }> {
  try {
    const baseUrl = serverUrl.replace(/\/mcp\/?$/, "");
    const response = await fetch(baseUrl, {
      method: "GET",
      signal: AbortSignal.timeout(3000),
    });

    if (response.ok) {
      return { healthy: true };
    }

    return { healthy: false, error: `Server returned ${response.status}` };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to connect";
    return { healthy: false, error: message };
  }
}
