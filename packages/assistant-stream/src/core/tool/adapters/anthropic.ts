import { toToolsJSONSchema, type ToolJSONSchema } from "../schema-utils";
import type { Tool } from "../tool-types";
import type {
  ToolWireFormatAdapter,
  ToolWireFormatInput,
  ToolWireFormatOutput,
} from "../wire-format";

export type AnthropicToolSearchOptions = {
  /** Search variant. Defaults to `"bm25"`. */
  variant?: "bm25" | "regex";
  /** Beta header value. Override only when Anthropic moves the API. */
  betaHeader?: string;
};

const DEFAULT_BETA = "advanced-tool-use-2025-11-20";

/**
 * Maps `(tools, deferredTools)` to Anthropic's Tool Search Tool wire format:
 * a top-level `tool_search_tool_{variant}_20251119` entry plus per-tool
 * `providerOptions.anthropic.deferLoading: true` on each deferred tool.
 */
export function anthropicToolSearchAdapter(
  options: AnthropicToolSearchOptions = {},
): ToolWireFormatAdapter {
  const variant = options.variant ?? "bm25";
  const beta = options.betaHeader ?? DEFAULT_BETA;
  const entryType =
    variant === "regex"
      ? ("tool_search_tool_regex_20251119" as const)
      : ("tool_search_tool_bm25_20251119" as const);
  const entryName = `tool_search_tool_${variant}`;

  return {
    id: "anthropic-tool-search",
    format(input: ToolWireFormatInput): ToolWireFormatOutput {
      const core = toToolsJSONSchema(input.tools ?? {});
      const deferred = toToolsJSONSchema(input.deferredTools ?? {}, {
        decorate: (_name, schema) =>
          stampProviderOptions(schema, "anthropic", { deferLoading: true }),
      });
      const catalogKnown = mergeCatalogKnownTools(input.catalogs);
      const catalogDeferred = toToolsJSONSchema(catalogKnown, {
        decorate: (_name, schema) =>
          stampProviderOptions(schema, "anthropic", { deferLoading: true }),
      });
      const hasDeferred =
        Object.keys(deferred).length > 0 ||
        Object.keys(catalogDeferred).length > 0;
      // Globally sort the merged set for byte-stable cache keys. Core and
      // deferred tools are each sorted individually by toToolsJSONSchema, but
      // the combined set must also be sorted so two different mount orders
      // produce the same request body.
      const mergedEntries = Object.entries({
        ...core,
        ...deferred,
        ...catalogDeferred,
      }).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
      const tools: ToolWireFormatOutput["tools"] =
        Object.fromEntries(mergedEntries);
      if (hasDeferred) {
        tools[entryName] = { type: entryType, name: entryName };
      }
      // One discovery callout per catalog, so the consumer's AI SDK route
      // handler can wire `execute` to `catalog.search` + emit
      // tool_reference blocks via `toModelOutput`.
      for (const catalog of input.catalogs ?? []) {
        tools[`__aui_catalog_search__${catalog.catalogId}`] = {
          description: `Search the '${catalog.catalogId}' tool catalog.`,
          parameters: {
            type: "object",
            properties: { query: { type: "string" } },
            required: ["query"],
          },
          providerOptions: {
            anthropic: { toModelOutputAsToolReference: true },
            aui: { catalogId: catalog.catalogId },
          },
        } as unknown as ToolJSONSchema;
      }
      return {
        tools,
        ...(hasDeferred && { extraHeaders: { "anthropic-beta": beta } }),
      };
    },
  };
}

function mergeCatalogKnownTools(
  catalogs: ToolWireFormatInput["catalogs"],
): Record<string, Tool> {
  const out: Record<string, Tool> = {};
  for (const catalog of catalogs ?? []) {
    Object.assign(out, catalog.knownTools ?? {});
  }
  return out;
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
