import { toToolsJSONSchema, type ToolJSONSchema } from "./schema-utils";
import type { Tool } from "./tool-types";

export type DiscoveryWrapperOptions = {
  tools: Record<string, Tool> | undefined;
  deferredTools: Record<string, Tool> | undefined;
};

const DISCOVER_NAME = "aui_discover_tools";
const RUN_NAME = "aui_run_dynamic_tool";

/**
 * Returns a wire-format-shaped tools record containing:
 *   - `aui_discover_tools` — stable search wrapper,
 *   - `aui_run_dynamic_tool` — stable execution wrapper,
 *   - any eager (non-deferred) tools from `tools`.
 *
 * Deferred tools are NOT shipped on the wire. The consumer's AI SDK route
 * handler implements `execute` for both wrapper tools, dispatching to the
 * relevant deferred tool by name.
 *
 * This is the cache-safe fallback for providers without native deferred
 * loading (data-stream, ag-ui): the cacheable prefix stays stable regardless
 * of how many deferred tools exist. When there are no deferred tools the
 * wrappers are omitted entirely, so existing tool-only consumers are
 * unaffected.
 */
export function injectDiscoveryWrappers(
  options: DiscoveryWrapperOptions,
): Record<string, ToolJSONSchema> {
  const core = toToolsJSONSchema(options.tools ?? {});

  const hasDeferred =
    !!options.deferredTools && Object.keys(options.deferredTools).length > 0;
  if (!hasDeferred) return core;

  for (const reserved of [DISCOVER_NAME, RUN_NAME]) {
    if (reserved in core) {
      throw new Error(
        `Tool name '${reserved}' is reserved for progressive tool disclosure; ` +
          `rename the conflicting tool.`,
      );
    }
  }

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
