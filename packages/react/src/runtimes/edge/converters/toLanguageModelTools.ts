import { LanguageModelV1FunctionTool } from "@ai-sdk/provider";
import { JSONSchema7 } from "json-schema";
import { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";
import { Tool } from "../../../model-context/ModelContextTypes";

export const toLanguageModelTools = (
  tools: Record<string, Tool<any, any>>,
): LanguageModelV1FunctionTool[] => {
  return Object.entries(tools).map(([name, tool]) => ({
    type: "function",
    name,
    ...(tool.description ? { description: tool.description } : undefined),
    parameters: (tool.parameters instanceof z.ZodType
      ? zodToJsonSchema(tool.parameters)
      : tool.parameters) as JSONSchema7,
  }));
};
