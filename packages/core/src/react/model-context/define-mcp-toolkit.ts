import type { McpServerConfig } from "assistant-stream";
import type { Toolkit } from "./toolbox";

export type McpToolkitEntry =
  | McpServerConfig
  | {
      server: McpServerConfig;
      disabled?: boolean | undefined;
      tools?: Record<string, McpToolkitToolConfig> | undefined;
    };

export type McpToolkitToolConfig = {
  disabled?: boolean | undefined;
};

export type McpToolkitDefinition = Record<string, McpToolkitEntry>;

/**
 * Defines MCP server tools as a spreadable toolkit fragment. Pass a raw
 * `McpServerConfig` for always-on servers, or `{ server, disabled, tools }`
 * when a server should stay configured but not expose all tools for the current
 * request.
 */
export function defineMcpToolkit(definition: McpToolkitDefinition): Toolkit {
  return Object.fromEntries(
    Object.entries(definition).map(([name, entry]) => {
      const server = "server" in entry ? entry.server : entry;
      const disabled = "server" in entry ? entry.disabled : undefined;
      const tools = "server" in entry ? entry.tools : undefined;

      return [
        name,
        {
          type: "mcp",
          server,
          ...(disabled !== undefined && { disabled }),
          ...(tools !== undefined && { tools }),
        },
      ];
    }),
  ) as Toolkit;
}
