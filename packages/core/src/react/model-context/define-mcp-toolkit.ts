import type { McpServerConfig } from "assistant-stream";
import type { Toolkit } from "./toolbox";

export type McpToolkitEntry =
  | McpServerConfig
  | {
      server: McpServerConfig;
      /**
       * Prefix applied to every tool name exposed by this MCP server. Useful
       * when multiple servers publish the same tool name, such as `search`.
       */
      prefix?: string | undefined;
    };

export type McpToolkitDefinition = Record<string, McpToolkitEntry>;

/**
 * Defines MCP server tools as a spreadable toolkit fragment.
 */
export function defineMcpToolkit(definition: McpToolkitDefinition): Toolkit {
  return Object.fromEntries(
    Object.entries(definition).map(([name, entry]) => {
      const { server, prefix } = normalizeMcpToolkitEntry(entry);
      return [
        name,
        { type: "mcp", server, ...(prefix !== undefined && { prefix }) },
      ];
    }),
  ) as Toolkit;
}

function normalizeMcpToolkitEntry(entry: McpToolkitEntry): {
  server: McpServerConfig;
  prefix?: string | undefined;
} {
  if ("server" in entry) return entry;
  return { server: entry };
}
