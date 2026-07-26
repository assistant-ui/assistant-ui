import { isRecord } from "@assistant-ui/core/internal";

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
