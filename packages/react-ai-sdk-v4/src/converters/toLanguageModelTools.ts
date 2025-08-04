import { LanguageModelV1FunctionTool } from "@ai-sdk/provider";
import { JSONSchema7 } from "json-schema";
import { z } from "zod";
import { Tool } from "@assistant-ui/react";

/**
 * @deprecated This is an internal API and may change without notice.
 */
export const toLanguageModelTools = (
  tools: Record<string, Tool<any, any>>,
): LanguageModelV1FunctionTool[] => {
  return Object.entries(tools).map(([name, tool]) => ({
    type: "function",
    name,
    ...(tool.description ? { description: tool.description } : undefined),
    parameters: (tool.parameters instanceof z.ZodType
      ? z.toJSONSchema(tool.parameters)
      : tool.parameters) as JSONSchema7,
  }));
};
