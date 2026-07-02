import type { McpServerConfig } from "assistant-stream";
import type { Toolkit } from "./toolbox";

export type McpToolkitEntry =
  | McpServerConfig
  | {
      server: McpServerConfig;
      disabled?: boolean | undefined;
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
      const { disabled, prefix, server } = normalizeMcpToolkitEntry(entry);
      return [
        name,
        {
          type: "mcp",
          server,
          ...(disabled !== undefined && { disabled }),
          ...(prefix !== undefined && { prefix }),
        },
      ];
    }),
  ) as Toolkit;
}

function normalizeMcpToolkitEntry(entry: McpToolkitEntry): {
  server: McpServerConfig;
  disabled?: boolean | undefined;
  prefix?: string | undefined;
} {
  if ("type" in entry) return { server: entry };
  return entry;
}
