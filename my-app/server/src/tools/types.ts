export interface ToolResult {
  [key: string]: unknown;
  structuredContent?: Record<string, unknown>;
  content: Array<{ type: "text"; text: string }>;
  _meta?: Record<string, unknown>;
  isError?: boolean;
}

export type ToolHandler = (
  args: Record<string, unknown>,
  extra?: unknown
) => Promise<ToolResult>;
