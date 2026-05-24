import type { Tool } from "./tool-types";
import type { ToolJSONSchema } from "./schema-utils";

/**
 * Input passed to {@link ToolWireFormatAdapter.format}.
 */
export type ToolWireFormatInput = {
  /** Tools registered via `useAssistantTool(...)` (eager). */
  tools: Record<string, Tool> | undefined;
  /** Tools registered via `useAssistantTool({ deferLoading: true })`. */
  deferredTools: Record<string, Tool> | undefined;
};

/**
 * Output produced by a {@link ToolWireFormatAdapter}. The `tools` map is
 * what gets serialized into the request body; `extraHeaders` are merged
 * into the outbound HTTP request; `extraBody` is merged into the request
 * body (escape hatch for provider-specific top-level flags, used sparingly).
 */
export type ToolWireFormatOutput = {
  tools: Record<string, ToolJSONSchema | ToolSearchEntry>;
  extraHeaders?: Record<string, string>;
  extraBody?: Record<string, unknown>;
};

/** Sentinel tool entries that providers expect inside `tools[]`. */
export type ToolSearchEntry =
  | {
      type:
        | "tool_search_tool_bm25_20251119"
        | "tool_search_tool_regex_20251119";
      name: string;
    }
  | { type: "tool_search" };

/**
 * Provider-specific translation from assistant-ui's `(tools, deferredTools)`
 * pair to the wire format that provider's caching layer expects.
 *
 * Implementations:
 *  - {@link anthropicToolSearchAdapter} for Claude Sonnet 4.x+ via AI SDK v6.
 *  - {@link openaiToolSearchAdapter} for GPT-5.4+ via AI SDK v6.
 *  - {@link genericFallbackAdapter} for adapters without native deferred
 *    loading; injects stable discovery wrappers instead.
 */
export interface ToolWireFormatAdapter {
  readonly id: string;
  format(input: ToolWireFormatInput): ToolWireFormatOutput;
}
