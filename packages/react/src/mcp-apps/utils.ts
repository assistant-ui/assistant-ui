import type { ToolCallMessagePart, McpAppMetadata } from "@assistant-ui/core";

type ToolPartLike = Pick<ToolCallMessagePart, "mcp">;

export function getMcpAppFromToolPart(
  part: ToolPartLike,
): McpAppMetadata | undefined {
  const app = part.mcp?.app;
  if (!app || typeof app.resourceUri !== "string") return undefined;
  if (!app.resourceUri.startsWith("ui://")) return undefined;
  return app;
}
