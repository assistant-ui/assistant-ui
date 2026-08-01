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

// The MCP Apps pointer on CallToolResult._meta: canonical nested `ui.resourceUri`
// per the Apps spec (2026-01-26), with the deprecated flat `"ui/resourceUri"` kept
// for legacy producers. Only ui:// URIs identify a widget.
export const readMcpAppResourceUri = (meta: unknown): string | undefined => {
  if (!isRecord(meta)) return undefined;
  const ui = meta["ui"];
  const nested = isRecord(ui) ? ui["resourceUri"] : undefined;
  if (typeof nested === "string" && isMcpAppUri(nested)) return nested;
  const flat = meta["ui/resourceUri"];
  return typeof flat === "string" && isMcpAppUri(flat) ? flat : undefined;
};
