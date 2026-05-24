import { toToolsJSONSchema, type ToolJSONSchema } from "./schema-utils";
import type { Tool } from "./tool-types";

export type DiscoveryWrapperOptions = {
  adapterId: string;
  tools: Record<string, Tool> | undefined;
  deferredTools: Record<string, Tool> | undefined;
  /** Optional pre-known catalog entries to pre-warm the wrapper schema. */
  catalogKnownTools?: Record<string, Tool>;
};

const DISCOVER_NAME = "aui_discover_tools";
const RUN_NAME = "aui_run_dynamic_tool";

/**
 * Returns a wire-format-shaped tools record containing:
 *   - `aui_discover_tools` — stable search wrapper,
 *   - `aui_run_dynamic_tool` — stable execution wrapper,
 *   - any eager (non-deferred) tools from `tools`.
 *
 * Deferred tools and catalog known tools are NOT shipped on the wire.
 * The consumer's AI SDK route handler implements `execute` for both
 * wrapper tools, typically by dispatching into a registered `ToolCatalog`.
 *
 * This is the cache-safe fallback for providers without native deferred
 * loading (data-stream, langgraph, ag-ui, google-adk). It replaces the
 * pre-PR5 `mergeDeferredToolsWithWarning`, which reintroduced context
 * bloat by shipping the entire deferred catalog on every request.
 */
export function injectDiscoveryWrappers(
  options: DiscoveryWrapperOptions,
): Record<string, ToolJSONSchema> {
  const core = toToolsJSONSchema(options.tools ?? {});
  return {
    ...core,
    [DISCOVER_NAME]: {
      description:
        "Search for application tools relevant to the current task. Call this first to find dynamic tools available in the current context.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "What capability is needed.",
          },
          max: {
            type: "integer",
            minimum: 1,
            maximum: 16,
            description: "Maximum tools to return. Default 5.",
          },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
    [RUN_NAME]: {
      description:
        "Execute a previously-discovered tool. Only call after aui_discover_tools has returned a matching tool.",
      parameters: {
        type: "object",
        properties: {
          toolName: { type: "string" },
          args: {
            type: "object",
            additionalProperties: true,
          },
        },
        required: ["toolName", "args"],
        additionalProperties: false,
      },
    },
  };
}
