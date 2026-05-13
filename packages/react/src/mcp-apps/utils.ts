import {
  isMcpAppUri,
  type McpAppMetadata,
  type ToolCallMessagePart,
} from "@assistant-ui/core";

type ToolPartLike = Pick<ToolCallMessagePart, "mcp">;

export function getMcpAppFromToolPart(
  part: ToolPartLike,
): McpAppMetadata | undefined {
  const app = part.mcp?.app;
  if (!app) return undefined;
  if (!isMcpAppUri(app.resourceUri)) return undefined;
  return app;
}
