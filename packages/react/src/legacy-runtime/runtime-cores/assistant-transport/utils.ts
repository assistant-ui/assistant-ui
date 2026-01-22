import { Tool, toToolsJSONSchema, type ToolJSONSchema } from "assistant-stream";

/**
 * @deprecated Use `toToolsJSONSchema` from `assistant-stream` instead.
 */
export function toAISDKTools(
  tools: Record<string, Tool>,
): Record<string, ToolJSONSchema> {
  return toToolsJSONSchema(tools, { filter: () => true });
}

/**
 * @deprecated Use `toToolsJSONSchema` from `assistant-stream` instead, which includes filtering by default.
 */
export function getEnabledTools(
  tools: Record<string, Tool>,
): Record<string, Tool> {
  return Object.fromEntries(
    Object.entries(tools).filter(
      ([, tool]) => !tool.disabled && tool.type !== "backend",
    ),
  );
}

export async function createRequestHeaders(
  headersValue:
    | Record<string, string>
    | Headers
    | (() => Promise<Record<string, string> | Headers>),
): Promise<Headers> {
  const resolvedHeaders =
    typeof headersValue === "function" ? await headersValue() : headersValue;

  const headers = new Headers(resolvedHeaders);
  headers.set("Content-Type", "application/json");
  return headers;
}
