import type { JSONSchema7 } from "json-schema";

/**
 * Lightweight descriptor returned by a {@link ToolCatalog.search} call.
 * The full tool definition (description, parameters) is fetched on demand
 * via {@link ToolCatalog.describe}, keeping initial requests small.
 */
export type ToolCatalogDescriptor = {
  /** Stable name used by `execute`. */
  toolName: string;
  /** One-line summary shown to the model during discovery. */
  summary: string;
  /** Optional namespace; used by OpenAI for token-efficient grouping. */
  namespace?: string;
};

export type ToolCatalogDescription = {
  description: string;
  parameters: JSONSchema7;
};

export type ToolCatalog = {
  /** Stable id (used as `Tool.source.serverId` analogue). */
  catalogId: string;
  /**
   * Discovery callback. Receives the user's query and returns up to
   * `max` candidate tools. Implementations should be deterministic for a
   * given input to support response caching.
   */
  search: (input: {
    query: string;
    max: number;
  }) => Promise<ToolCatalogDescriptor[]>;
  /** Returns the full schema for a previously-discovered tool. */
  describe: (toolName: string) => Promise<ToolCatalogDescription>;
  /** Executes a previously-discovered tool. */
  execute: (input: {
    toolName: string;
    args: Record<string, unknown>;
    abortSignal: AbortSignal;
  }) => Promise<unknown>;
};
