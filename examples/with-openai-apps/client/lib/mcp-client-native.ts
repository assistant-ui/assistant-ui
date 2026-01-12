import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { dynamicTool, jsonSchema } from "ai";
import type { JSONSchema7 } from "json-schema";
import type { Tool } from "ai";
import { getServerById, type MCPServerConfig } from "./server-config";

interface ConnectedServer {
  id: string;
  client: Client;
  tools: Record<string, Tool<unknown, unknown>>;
}

/** Group server configs by their actual server (command+args or url) */
function groupByActualServer(
  serverIds: string[],
): Map<string, MCPServerConfig[]> {
  const groups = new Map<string, MCPServerConfig[]>();

  for (const serverId of serverIds) {
    const config = getServerById(serverId);
    if (!config) continue;

    // Create a key based on the actual server connection params
    const key =
      config.transport === "stdio"
        ? `stdio:${config.command}:${config.args?.join(",")}`
        : `sse:${config.url}`;

    const existing = groups.get(key) || [];
    existing.push(config);
    groups.set(key, existing);
  }

  return groups;
}

export async function createMultiServerMCPClient(enabledServerIds: string[]) {
  const connectedServers: ConnectedServer[] = [];
  const aggregatedTools: Record<string, Tool<unknown, unknown>> = {};

  // Group configs by actual server to avoid spawning duplicates
  const serverGroups = groupByActualServer(enabledServerIds);

  // Connect to all servers in parallel with timeout
  const CONNECTION_TIMEOUT = 5000; // 5 seconds per server

  const connectionPromises = Array.from(serverGroups.entries()).map(
    async ([, configs]) => {
      const config = configs[0];
      if (!config) return null;

      try {
        // Add timeout to connection
        const connectionPromise = connectToServer(config);
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(`Connection timeout after ${CONNECTION_TIMEOUT}ms`),
              ),
            CONNECTION_TIMEOUT,
          ),
        );

        const { client, tools } = await Promise.race([
          connectionPromise,
          timeoutPromise,
        ]);

        const enabledNames = configs.map((c) => c.name).join(", ");
        console.log(
          `[MCP] Connected (${enabledNames}): ${Object.keys(tools).length} tools`,
        );

        return { config, client, tools, configs };
      } catch (error) {
        console.error(`[MCP] Failed to connect to ${config.name}:`, error);
        return null;
      }
    },
  );

  const results = await Promise.all(connectionPromises);

  for (const result of results) {
    if (!result) continue;
    const { config, client, tools } = result;

    connectedServers.push({ id: config.id, client, tools });

    // Merge tools into aggregated set, prefixing with server ID to avoid collisions
    for (const [toolName, tool] of Object.entries(tools)) {
      // Use server ID prefix if there's a collision, otherwise use plain name
      const key =
        toolName in aggregatedTools ? `${config.id}:${toolName}` : toolName;
      aggregatedTools[key] = tool;
    }
  }

  return {
    tools: () => aggregatedTools,
    close: async () => {
      for (const server of connectedServers) {
        try {
          await server.client.close();
        } catch (e) {
          console.warn(`[MCP] Error closing ${server.id}:`, e);
        }
      }
    },
  };
}

async function connectToServer(
  config: MCPServerConfig,
): Promise<{ client: Client; tools: Record<string, Tool<unknown, unknown>> }> {
  let transport;

  if (config.transport === "stdio") {
    if (!config.command || !config.args) {
      throw new Error(`Stdio server ${config.id} missing command/args`);
    }
    transport = new StdioClientTransport({
      command: config.command,
      args: config.args,
    });
  } else if (config.transport === "sse") {
    if (!config.url) {
      throw new Error(`SSE server ${config.id} missing url`);
    }
    transport = new SSEClientTransport(new URL(config.url));
  } else if (config.transport === "streamable-http") {
    if (!config.url) {
      throw new Error(`Streamable HTTP server ${config.id} missing url`);
    }
    transport = new StreamableHTTPClientTransport(new URL(config.url));
  } else {
    throw new Error(`Unknown transport type for ${config.id}`);
  }

  const client = new Client(
    {
      name: "mcp-ui-client-demo",
      version: "1.0.0",
    },
    {
      capabilities: {},
    },
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await client.connect(transport as any);

  const { tools: mcpTools } = await client.listTools();

  console.log(
    `[MCP ${config.id}] Discovered ${mcpTools.length} tools:`,
    mcpTools.map((t) => t.name),
  );

  const aiSdkTools: Record<string, Tool<unknown, unknown>> = {};

  // Store tool definition metadata (contains openai/outputTemplate)
  const toolMeta: Record<string, Record<string, unknown>> = {};

  for (const mcpTool of mcpTools) {
    const schema = mcpTool.inputSchema as JSONSchema7;
    const { $schema: _, ...cleanSchema } = schema;

    const mcpToolName = mcpTool.name;
    const mcpToolDescription = mcpTool.description || "";

    // Capture _meta from tool definition (this is where openai/outputTemplate lives)
    const definitionMeta = (mcpTool as Record<string, unknown>)["_meta"] as
      | Record<string, unknown>
      | undefined;
    if (definitionMeta) {
      toolMeta[mcpToolName] = definitionMeta;
      console.log(
        `[MCP ${config.id}] Tool ${mcpToolName} has _meta:`,
        JSON.stringify(definitionMeta).slice(0, 200),
      );
    }

    aiSdkTools[mcpToolName] = dynamicTool({
      description: mcpToolDescription,
      inputSchema: jsonSchema<unknown>(cleanSchema),
      execute: async (input: unknown) => {
        const args = input as Record<string, unknown>;
        console.log(
          `[MCP ${config.id}] Calling ${mcpToolName} with args:`,
          JSON.stringify(args),
        );

        const result = await client.callTool({
          name: mcpToolName,
          arguments: args,
        });

        console.log(
          `[MCP ${config.id}] ${mcpToolName} result:`,
          JSON.stringify(result).slice(0, 500),
        );

        const resultMeta = (result as Record<string, unknown>)["_meta"] as
          | Record<string, unknown>
          | undefined;
        const defMeta = toolMeta[mcpToolName];

        const templateUri =
          (resultMeta?.["openai/outputTemplate"] as string | undefined) ||
          (defMeta?.["openai/outputTemplate"] as string | undefined);

        if (templateUri) {
          (result as Record<string, unknown>)["_templateUri"] = templateUri;
          console.log(`[MCP ${config.id}] Template URI: ${templateUri}`);
        }

        return result;
      },
    });
  }

  return { client, tools: aiSdkTools };
}

// Legacy single-server client for backwards compatibility
export async function createNativeMCPClient() {
  return createMultiServerMCPClient(["pizza-map"]);
}
