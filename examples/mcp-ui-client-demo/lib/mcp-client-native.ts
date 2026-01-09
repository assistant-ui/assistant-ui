import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { dynamicTool, jsonSchema } from "ai";
import type { JSONSchema7 } from "json-schema";
import type { Tool } from "ai";

export async function createNativeMCPClient() {
  const transport = new StdioClientTransport({
    command: "node",
    args: ["../mcp-server-with-ui/dist/server.js"],
  });

  const client = new Client(
    {
      name: "mcp-ui-client-demo",
      version: "1.0.0",
    },
    {
      capabilities: {},
    },
  );

  await client.connect(transport);

  const { tools: mcpTools } = await client.listTools();
  console.log(
    `[MCP Native] Loaded ${mcpTools.length} tools:`,
    mcpTools.map((t) => t.name),
  );

  const aiSdkTools: Record<string, Tool<unknown, unknown>> = {};

  for (const mcpTool of mcpTools) {
    const schema = mcpTool.inputSchema as JSONSchema7;
    const { $schema: _, ...cleanSchema } = schema;

    const mcpToolName = mcpTool.name;
    const mcpToolDescription = mcpTool.description || "";

    aiSdkTools[mcpToolName] = dynamicTool({
      description: mcpToolDescription,
      inputSchema: jsonSchema<unknown>(cleanSchema),
      execute: async (input: unknown) => {
        const args = input as Record<string, unknown>;
        console.log(
          `[MCP Native] Calling ${mcpToolName} with args:`,
          JSON.stringify(args),
        );

        const result = await client.callTool({
          name: mcpToolName,
          arguments: args,
        });

        console.log(
          `[MCP Native] ${mcpToolName} result:`,
          JSON.stringify(result),
        );

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
