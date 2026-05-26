import {
  isMcpAppUri,
  type McpAppMetadata,
  type ToolCallMessagePart,
} from "@assistant-ui/core";

type ToolPartLike = Pick<ToolCallMessagePart, "mcp">;

/**
 * Returns MCP app metadata for a tool-call part that points at a `ui://`
 * resource.
 *
 * Returns `undefined` when the part has no MCP app metadata or the metadata
 * does not reference an assistant-ui MCP app resource.
 */
export function getMcpAppFromToolPart(
  part: ToolPartLike,
): McpAppMetadata | undefined {
  const app = part.mcp?.app;
  if (!app) return undefined;
  if (!isMcpAppUri(app.resourceUri)) return undefined;
  return app;
}
