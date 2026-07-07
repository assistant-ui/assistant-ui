import { jsonSchema, type ToolSet } from "ai";
import type { ToolJSONSchema } from "assistant-stream";
import { unwrapModelContentEnvelope } from "./modelContentEnvelope";
import { toAISDKContent, toAISDKDefaultOutput } from "./toolOutputConversion";

export const defaultToModelOutput = ({ output }: { output: unknown }) => {
  const { result, modelContent } = unwrapModelContentEnvelope(output);
  if (modelContent !== undefined) {
    return toAISDKContent(modelContent);
  }
  return toAISDKDefaultOutput(result);
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function validateFrontendTool(
  name: string,
  tool: unknown,
): asserts tool is ToolJSONSchema {
  if (!isPlainObject(tool)) {
    throw new Error(
      `frontendTools() expected tool "${name}" to be an object with a JSON Schema parameters object.`,
    );
  }

  if (!isPlainObject(tool.parameters)) {
    throw new Error(
      `frontendTools() expected tool "${name}" to include a JSON Schema parameters object.`,
    );
  }

  if (tool.description !== undefined && typeof tool.description !== "string") {
    throw new Error(
      `frontendTools() expected tool "${name}" description to be a string.`,
    );
  }

  if (
    tool.providerOptions !== undefined &&
    !isPlainObject(tool.providerOptions)
  ) {
    throw new Error(
      `frontendTools() expected tool "${name}" providerOptions to be an object.`,
    );
  }
}

function validateFrontendTools(
  tools: unknown,
): asserts tools is Record<string, ToolJSONSchema> {
  if (!isPlainObject(tools)) {
    throw new Error(
      "frontendTools() expected tools to be an object keyed by tool name.",
    );
  }

  for (const [name, tool] of Object.entries(tools)) {
    validateFrontendTool(name, tool);
  }
}

export const frontendTools = (
  tools: Record<string, ToolJSONSchema>,
): ToolSet => {
  validateFrontendTools(tools);

  return Object.fromEntries(
    Object.entries(tools).map(([name, tool]) => [
      name,
      {
        ...(tool.description !== undefined && {
          description: tool.description,
        }),
        inputSchema: jsonSchema(tool.parameters),
        toModelOutput: defaultToModelOutput,
        ...(tool.providerOptions && { providerOptions: tool.providerOptions }),
      },
    ]),
  ) as ToolSet;
};
