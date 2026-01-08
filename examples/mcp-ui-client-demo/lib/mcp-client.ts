import { experimental_createMCPClient as createMCPClient } from "@ai-sdk/mcp";
import { Experimental_StdioMCPTransport as StdioMCPTransport } from "@ai-sdk/mcp/mcp-stdio";

/**
 * Create an MCP client for the weather server.
 *
 * Supports two modes:
 * 1. HTTP/SSE transport (if MCP_SERVER_URL is set)
 * 2. Stdio transport (spawns the server process directly)
 */
export async function createWeatherMCPClient() {
  // Check for HTTP MCP server first
  const mcpServerUrl = process.env["MCP_SERVER_URL"];

  if (mcpServerUrl) {
    console.log(`[MCP] Connecting via HTTP/SSE to ${mcpServerUrl}`);
    const client = await createMCPClient({
      transport: {
        type: "sse",
        url: mcpServerUrl,
      },
    });
    return client;
  }

  // Fallback to stdio transport (requires server to be built)
  console.log("[MCP] Connecting via stdio transport");
  const client = await createMCPClient({
    transport: new StdioMCPTransport({
      command: "node",
      args: ["../mcp-server-with-ui/dist/server.js"],
    }),
  });

  return client;
}
