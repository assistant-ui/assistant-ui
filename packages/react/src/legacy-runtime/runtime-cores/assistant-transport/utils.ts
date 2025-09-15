import { Tool } from "assistant-stream";
import { JSONSchema7 } from "json-schema";
import { z } from "zod";

// Convert tools to AI SDK format
export const toAISDKTools = (tools: Record<string, Tool>) => {
  return Object.fromEntries(
    Object.entries(tools).map(([name, tool]) => [
      name,
      {
        ...(tool.description ? { description: tool.description } : undefined),
        parameters: (tool.parameters instanceof z.ZodType
          ? z.toJSONSchema(tool.parameters)
          : tool.parameters) as JSONSchema7,
      },
    ]),
  );
};

// Filter enabled tools
export const getEnabledTools = (tools: Record<string, Tool>) => {
  return Object.fromEntries(
    Object.entries(tools).filter(
      ([, tool]) => !tool.disabled && tool.type !== "backend",
    ),
  );
};

// Create headers for fetch request
export const createRequestHeaders = async (
  headersValue:
    | Record<string, string>
    | Headers
    | (() => Promise<Record<string, string> | Headers>),
): Promise<Headers> => {
  const resolvedHeaders =
    typeof headersValue === "function" ? await headersValue() : headersValue;

  const headers = new Headers(resolvedHeaders);
  headers.set("Content-Type", "application/json");
  return headers;
};
