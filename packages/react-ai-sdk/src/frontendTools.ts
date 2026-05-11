import { jsonSchema } from "ai";
import type { JSONSchema7 } from "json-schema";
import type { ToolModelContentPart } from "assistant-stream";
import { isModelContentEnvelope } from "./modelContentEnvelope";

type FrontendToolResultOutput =
  | { type: "text"; value: string }
  | { type: "json"; value: unknown }
  | {
      type: "content";
      value: Array<
        | { type: "text"; text: string }
        | {
            type: "file";
            mediaType: string;
            data: { type: "data"; data: string };
            filename?: string;
          }
      >;
    };

const toAISDKContent = (
  parts: readonly ToolModelContentPart[],
): FrontendToolResultOutput => ({
  type: "content",
  value: parts.map((part) =>
    part.type === "text"
      ? { type: "text", text: part.text }
      : {
          type: "file",
          mediaType: part.mediaType,
          data: { type: "data", data: part.data },
          ...(part.filename && { filename: part.filename }),
        },
  ),
});

const defaultToModelOutput = ({
  output,
}: {
  output: unknown;
}): FrontendToolResultOutput => {
  if (isModelContentEnvelope(output)) {
    return toAISDKContent(output.__aui_modelContent);
  }
  return typeof output === "string"
    ? { type: "text", value: output }
    : { type: "json", value: output ?? null };
};

export const frontendTools = (
  tools: Record<string, { description?: string; parameters: JSONSchema7 }>,
) =>
  Object.fromEntries(
    Object.entries(tools).map(([name, tool]) => [
      name,
      {
        ...(tool.description ? { description: tool.description } : undefined),
        inputSchema: jsonSchema(tool.parameters),
        toModelOutput: defaultToModelOutput,
      },
    ]),
  );
