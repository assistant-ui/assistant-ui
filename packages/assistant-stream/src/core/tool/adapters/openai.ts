import { toToolsJSONSchema, type ToolJSONSchema } from "../schema-utils";
import type {
  ToolWireFormatAdapter,
  ToolWireFormatInput,
  ToolWireFormatOutput,
} from "../wire-format";

export type OpenAIToolSearchOptions = Record<string, never>;

/**
 * Maps `(tools, deferredTools)` to OpenAI's Tool Search wire format:
 * a top-level `{ type: "tool_search" }` entry plus per-tool
 * `providerOptions.openai.deferLoading: true` on each deferred tool.
 */
export function openaiToolSearchAdapter(): ToolWireFormatAdapter {
  return {
    id: "openai-tool-search",
    format(input: ToolWireFormatInput): ToolWireFormatOutput {
      const core = toToolsJSONSchema(input.tools ?? {});
      const deferred = toToolsJSONSchema(input.deferredTools ?? {}, {
        decorate: (_name, schema) =>
          stampProviderOptions(schema, "openai", { deferLoading: true }),
      });
      const hasDeferred = Object.keys(deferred).length > 0;
      // Globally sort the merged set for byte-stable cache keys.
      const mergedEntries = Object.entries({ ...core, ...deferred }).sort(
        ([a], [b]) => (a < b ? -1 : a > b ? 1 : 0),
      );
      const tools: ToolWireFormatOutput["tools"] =
        Object.fromEntries(mergedEntries);
      if (hasDeferred) {
        tools.tool_search = { type: "tool_search" };
      }
      return { tools };
    },
  };
}

function stampProviderOptions(
  schema: ToolJSONSchema,
  provider: string,
  options: Record<string, unknown>,
): ToolJSONSchema {
  const existing =
    (schema as { providerOptions?: Record<string, unknown> }).providerOptions ??
    {};
  return {
    ...schema,
    providerOptions: { ...existing, [provider]: options },
  } as ToolJSONSchema;
}
