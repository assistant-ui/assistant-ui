import { experimental_createMCPClient as createMCPClient } from "@ai-sdk/mcp";
import type { ToolSet } from "ai";

let mcpClientPromise: ReturnType<typeof createMCPClient> | null = null;
let cachedTools: ToolSet | null = null;

export function getMcpClient(): ReturnType<typeof createMCPClient> {
  mcpClientPromise ??= createMCPClient({
    // TODO adjust this to point to your MCP server URL
    transport: {
      type: "http",
      url: "http://localhost:8000/mcp",
    },
  });
  return mcpClientPromise;
}

export async function getMcpTools(): Promise<ToolSet> {
  if (cachedTools) return cachedTools;
  const client = await getMcpClient();
  cachedTools = (await client.tools()) as ToolSet;
  return cachedTools;
}
