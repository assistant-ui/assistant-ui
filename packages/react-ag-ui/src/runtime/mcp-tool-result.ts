import { isRecord } from "@assistant-ui/core/internal";
import { isMcpAppUri } from "@assistant-ui/core";

export type McpToolCallResult = Record<string, unknown> & {
  content: unknown[];
  structuredContent?: Record<string, unknown>;
  _meta?: Record<string, unknown>;
  isError?: boolean;
};

export const parseMcpToolCallResult = (
  source: Record<string, unknown>,
  modelContent: string,
): McpToolCallResult | undefined => {
  const structuredContent = isRecord(source.structuredContent)
    ? source.structuredContent
    : undefined;
  const meta = isRecord(source._meta) ? source._meta : undefined;
  if (!structuredContent && !meta) return undefined;

  return {
    content: modelContent ? [{ type: "text", text: modelContent }] : [],
    ...(structuredContent ? { structuredContent } : {}),
    ...(meta ? { _meta: meta } : {}),
    ...(typeof source.isError === "boolean" ? { isError: source.isError } : {}),
  };
};

// _meta["ui/resourceUri"] is the MCP-UI pointer react-ai-sdk reads off
// CallToolResult._meta; only ui:// URIs identify an MCP Apps widget. A
// structured carrier is deliberately not read until upstream AG-UI settles
// one (agno-agi/agno#9087).
export const readMcpAppResourceUri = (meta: unknown): string | undefined => {
  if (!isRecord(meta)) return undefined;
  const uri = meta["ui/resourceUri"];
  return typeof uri === "string" && isMcpAppUri(uri) ? uri : undefined;
};
