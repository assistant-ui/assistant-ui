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
      tools?: Record<string, McpToolkitToolConfig> | undefined;
    };

export type McpToolkitToolConfig = {
  disabled?: boolean | undefined;
};

export type McpToolkitDefinition = Record<string, McpToolkitEntry>;

/**
 * Defines MCP server tools as a spreadable toolkit fragment. Pass a raw
 * `McpServerConfig` for always-on servers, or `{ server, disabled, prefix, tools }`
 * when a server should stay configured but not expose all tools for the current
 * request.
 *
 * Each key names a server, not a tool: the model sees the tools the server
 * lists, with `prefix` prepended to each name. Set `tools: { name: { disabled:
 * true } }` to hide individual tools, or `disabled: true` to skip the whole
 * server. The entries have `type: "mcp"`, so `Tools` does not register them
 * with model context. Your server opens the connections when it builds the tool
 * set with `AISDKToolkit`. In a `"use generative"` file the client build keeps
 * this call as written, so keep tokens out of `headers` and `env`.
 *
 * @example
 * ```tsx
 * export default defineMcpToolkit({
 *   docs: { type: "http", url: "https://mcp.example.com/mcp" },
 *   github: {
 *     server: { type: "http", url: "https://github.example.com/mcp" },
 *     prefix: "github_",
 *     tools: { delete_repo: { disabled: true } },
 *   },
 * });
 * ```
 */
export function defineMcpToolkit(definition: McpToolkitDefinition): Toolkit {
  return Object.fromEntries(
    Object.entries(definition).map(([name, entry]) => {
      const server = "server" in entry ? entry.server : entry;
      const disabled = "server" in entry ? entry.disabled : undefined;
      const prefix = "server" in entry ? entry.prefix : undefined;
      const tools = "server" in entry ? entry.tools : undefined;

      return [
        name,
        {
          type: "mcp",
          server,
          ...(disabled !== undefined && { disabled }),
          ...(prefix !== undefined && { prefix }),
          ...(tools !== undefined && { tools }),
        },
      ];
    }),
  ) as Toolkit;
}
