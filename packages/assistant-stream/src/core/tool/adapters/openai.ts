import { toToolsJSONSchema, type ToolJSONSchema } from "../schema-utils";
import type {
  ToolWireFormatAdapter,
  ToolWireFormatInput,
  ToolWireFormatOutput,
} from "../wire-format";

export type OpenAIToolSearchOptions = {
  /** Hosted (default) vs client-executed tool search. */
  mode?: "hosted" | "client";
};

/**
 * Maps `(tools, deferredTools)` to OpenAI's Tool Search wire format:
 * a top-level `{ type: "tool_search" }` entry plus per-tool
 * `providerOptions.openai.deferLoading: true` on each deferred tool.
 *
 * Use `mode: "client"` together with `useToolCatalog` (Phase 4) to drive
 * tenant/page-scoped catalogs through the search tool's `execute`
 * callback rather than hosted indexing.
 */
export function openaiToolSearchAdapter(
  options: OpenAIToolSearchOptions = {},
): ToolWireFormatAdapter {
  const mode = options.mode ?? "hosted";
  return {
    id: `openai-tool-search:${mode}`,
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
      // One client-executed search entry per catalog. The consumer's
      // AI SDK route handler wires `execute` to `catalog.search`.
      for (const catalog of input.catalogs ?? []) {
        tools[`tool_search__${catalog.catalogId}`] = {
          type: "tool_search",
          execution: "client",
          description: `Search the '${catalog.catalogId}' tool catalog.`,
          parameters: {
            type: "object",
            properties: { query: { type: "string" } },
            required: ["query"],
          },
          providerOptions: { aui: { catalogId: catalog.catalogId } },
        } as unknown as ToolJSONSchema;
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
