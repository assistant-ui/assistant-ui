import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { tool, jsonSchema } from "ai";
import type { JSONSchema7 } from "json-schema";

/**
 * Create an MCP client using the native MCP SDK instead of @ai-sdk/mcp.
 * This bypasses the @ai-sdk/mcp integration which has a race condition
 * where tool arguments arrive after the controller is closed.
 */
export async function createNativeMCPClient() {
  const transport = new StdioClientTransport({
    command: "node",
    args: ["../mcp-weather-ui/dist/server.js"],
  });

  const client = new Client(
    {
      name: "with-mcp-tool-ui",
      version: "1.0.0",
    },
    {
      capabilities: {},
    }
  );

  await client.connect(transport);

  // List available tools from the MCP server
  const { tools: mcpTools } = await client.listTools();
  console.log(`[MCP Native] Loaded ${mcpTools.length} tools:`, mcpTools.map(t => t.name));

  // Convert MCP tools to AI SDK format
  const aiSdkTools: Record<string, ReturnType<typeof tool>> = {};

  for (const mcpTool of mcpTools) {
    // Use JSON Schema directly - no conversion needed
    const schema = mcpTool.inputSchema as JSONSchema7;

    // Remove $schema property if present (OpenAI doesn't like it)
    const { $schema, ...cleanSchema } = schema;

    console.log(`[MCP Native] Tool ${mcpTool.name} schema:`, JSON.stringify(cleanSchema));

    aiSdkTools[mcpTool.name] = tool({
      description: mcpTool.description || "",
      inputSchema: jsonSchema(cleanSchema),
      execute: async (args) => {
        console.log(`[MCP Native] Calling ${mcpTool.name} with args:`, JSON.stringify(args));

        const result = await client.callTool({
          name: mcpTool.name,
          arguments: args as Record<string, unknown>,
        });

        console.log(`[MCP Native] ${mcpTool.name} result:`, JSON.stringify(result));

        // Return the result - AI SDK expects the raw result
        return result;
      },
    });
  }

  return {
    tools: () => aiSdkTools,
    close: async () => {
      await client.close();
    },
  };
}
