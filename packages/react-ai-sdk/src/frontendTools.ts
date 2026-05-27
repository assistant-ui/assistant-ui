import { jsonSchema, type ToolSet } from "ai";
import type { JSONSchema7 } from "json-schema";
import type { ToolModelContentPart } from "assistant-stream";
import { unwrapModelContentEnvelope } from "./modelContentEnvelope";

const toAISDKContent = (parts: readonly ToolModelContentPart[]) => ({
  type: "content" as const,
  value: parts.map((part) => {
    if (part.type === "text") {
      return { type: "text" as const, text: part.text };
    }
    const isImage = part.mediaType.startsWith("image/");
    return isImage
      ? {
          type: "image-data" as const,
          data: part.data,
          mediaType: part.mediaType,
        }
      : {
          type: "file-data" as const,
          data: part.data,
          mediaType: part.mediaType,
          ...(part.filename !== undefined && { filename: part.filename }),
        };
  }),
});

const defaultToModelOutput = ({ output }: { output: unknown }) => {
  const { modelContent } = unwrapModelContentEnvelope(output);
  if (modelContent !== undefined) {
    return toAISDKContent(modelContent);
  }
  return typeof output === "string"
    ? { type: "text" as const, value: output }
    : { type: "json" as const, value: (output ?? null) as any };
};

export const frontendTools = (
  tools: Record<
    string,
    {
      description?: string;
      parameters: JSONSchema7;
      providerOptions?: Record<string, Record<string, unknown>>;
    }
  >,
): ToolSet =>
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
