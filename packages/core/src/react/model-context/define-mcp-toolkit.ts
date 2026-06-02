import type { McpServerConfig } from "assistant-stream";
import type { Toolkit } from "./toolbox";

export type McpToolkitDefinition = Record<string, McpServerConfig>;

/**
 * Defines MCP server tools as a spreadable toolkit fragment.
 */
export function defineMcpToolkit(definition: McpToolkitDefinition): Toolkit {
  return Object.fromEntries(
    Object.entries(definition).map(([name, server]) => [
      name,
      { type: "mcp", server },
    ]),
  ) as Toolkit;
}
