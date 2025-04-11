import { LanguageModelV1FunctionTool } from "@ai-sdk/provider";
import { Tool } from "@assistant-ui/react";

/**
 * @deprecated This is an internal API and may change without notice.
 */
export const fromLanguageModelTools = (
  tools: LanguageModelV1FunctionTool[],
): Record<string, Tool<any, any>> => {
  return Object.fromEntries(
    tools.map((tool) => [
      tool.name,
      {
        description: tool.description,
        parameters: tool.parameters,
      },
    ]),
  );
};
