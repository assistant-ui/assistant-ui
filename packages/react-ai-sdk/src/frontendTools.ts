import { jsonSchema, type ToolSet } from "ai";
import type { ToolJSONSchema } from "assistant-stream";
import { unwrapModelContentEnvelope } from "./modelContentEnvelope";
import { toAISDKContent, toAISDKDefaultOutput } from "./toolOutputConversion";

/** Frontend tool definitions uploaded by AssistantChatTransport. */
export type FrontendTools = Record<string, ToolJSONSchema>;

export const defaultToModelOutput = ({ output }: { output: unknown }) => {
  const { result, modelContent } = unwrapModelContentEnvelope(output);
  if (modelContent !== undefined) {
    return toAISDKContent(modelContent);
  }
  return toAISDKDefaultOutput(result);
};

export const frontendTools = (tools: FrontendTools): ToolSet =>
  Object.fromEntries(
    Object.entries(tools).map(([name, t]) => [
      name,
      {
        ...(t.description !== undefined && { description: t.description }),
        inputSchema: jsonSchema(t.parameters),
        toModelOutput: defaultToModelOutput,
        ...(t.providerOptions && { providerOptions: t.providerOptions }),
      },
    ]),
  ) as ToolSet;
