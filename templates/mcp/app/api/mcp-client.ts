import { experimental_createMCPClient as createMCPClient } from "@ai-sdk/mcp";

let mcpClientPromise: ReturnType<typeof createMCPClient> | null = null;

export function getMcpClient() {
  mcpClientPromise ??= createMCPClient({
    // TODO adjust this to point to your MCP server URL
    transport: {
      type: "http",
      url: "http://localhost:8000/mcp",
    },
  });
  return mcpClientPromise;
}
