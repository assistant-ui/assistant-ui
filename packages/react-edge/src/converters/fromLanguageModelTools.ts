import { LanguageModelV1FunctionTool } from "@ai-sdk/provider";
import { Tool } from "@assistant-ui/react";

/**
 * @deprecated This is an internal API and may change without notice.
 */
export const fromLanguageModelTools = (
  tools: LanguageModelV1FunctionTool[] | Tool<any, any>[],
): Record<string, Omit<Tool<any, any>, "type">> => {
  return Object.fromEntries(tools.map((tool) => [tool.name, tool]));
};
