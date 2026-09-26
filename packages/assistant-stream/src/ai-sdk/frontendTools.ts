import { gateway, jsonSchema, type Tool, type ToolSet } from "ai";
import type { ToolJSONSchema } from "../core/tool/schema-utils";
import { unwrapModelContentEnvelope } from "./modelContentEnvelope";
import {
  toAISDKContent,
  toAISDKDefaultOutput,
  type TaggedAISDKContent,
} from "./toolOutputConversion";

// ai@7 speaks provider spec v4, whose tool-result content adds the tagged
// `file` part; ai@6 only accepts the base64 `file-data` part. `ai` exports no
// version, so the re-exported gateway provider's spec version stands in: an
// export only ai@7 has fails webpack and Turbopack builds under ai@6, and a
// computed or `in` read keeps all of `ai` in the bundle.
const supportsTaggedFileData =
  (gateway.specificationVersion as string) === "v4";

type ToolModelOutput = Awaited<ReturnType<NonNullable<Tool["toModelOutput"]>>>;
type InstalledTaggedFilePart = Extract<
  Extract<ToolModelOutput, { type: "content" }>["value"][number],
  { type: "file" }
>;
// ai@6's types have no tagged part, so the tagged branch is asserted; under
// ai@7 the cast target degrades to unknown if the emitted content drifts.
type TaggedToolModelOutput = [InstalledTaggedFilePart] extends [never]
  ? ToolModelOutput
  : TaggedAISDKContent extends ToolModelOutput
    ? ToolModelOutput
    : unknown;

/** Frontend tool definitions uploaded by AssistantChatTransport. */
export type FrontendTools = Record<string, ToolJSONSchema>;

const defaultToModelOutput: NonNullable<Tool["toModelOutput"]> = ({
  output,
}) => {
  const { result, modelContent } = unwrapModelContentEnvelope(output);
  if (modelContent === undefined) {
    return toAISDKDefaultOutput(result);
  }
  return supportsTaggedFileData
    ? (toAISDKContent(modelContent, {
        taggedFileData: true,
      }) as unknown as TaggedToolModelOutput)
    : toAISDKContent(modelContent, { taggedFileData: false });
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

function validateFrontendTools(tools: unknown): asserts tools is FrontendTools {
  if (!isPlainObject(tools)) {
    throw new Error(
      "frontendTools() expected tools to be an object keyed by tool name.",
    );
  }

  for (const [name, tool] of Object.entries(tools)) {
    validateFrontendTool(name, tool);
  }
}

export const frontendTools = (tools: FrontendTools): ToolSet => {
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
