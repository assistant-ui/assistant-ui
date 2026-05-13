import type { ToolCallMessagePart, MCPAppMetadata } from "@assistant-ui/core";

type ToolPartLike = Pick<ToolCallMessagePart, "mcp">;

export function getMCPAppFromToolPart(
  part: ToolPartLike,
): MCPAppMetadata | undefined {
  const app = part.mcp?.app;
  if (!app || typeof app.resourceUri !== "string") return undefined;
  if (!app.resourceUri.startsWith("ui://")) return undefined;
  return app;
}

export function isMCPAppPart(part: ToolPartLike): boolean {
  return getMCPAppFromToolPart(part) !== undefined;
}
