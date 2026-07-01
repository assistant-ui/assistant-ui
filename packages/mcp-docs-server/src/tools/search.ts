import { z } from "zod/v3";
import { logger } from "../utils/logger.js";
import { formatMCPResponse } from "../utils/mcp-format.js";
import { searchDocs } from "../utils/search.js";

const searchInputSchema = z.object({
  query: z
    .string()
    .min(1)
    .describe("Keyword(s) to search assistant-ui documentation for."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(25)
    .default(10)
    .describe("Maximum number of results to return (default 10)."),
});

export const searchTools = {
  name: "assistantUISearch",
  description:
    "Search assistant-ui documentation by keyword. Returns ranked matches with their doc path, title, and a snippet. Fetch full content with assistantUIDocs using a returned path.",
  parameters: searchInputSchema.shape,
  execute: async ({ query, limit }: z.infer<typeof searchInputSchema>) => {
    logger.info(`Searching documentation for: ${query}`);
    try {
      const results = await searchDocs(query, limit);
      if (results.length === 0) {
        return formatMCPResponse({
          query,
          results: [],
          total: 0,
          hint: 'No matches. Use assistantUIDocs with "/" to list all sections.',
        });
      }
      return formatMCPResponse({ query, results, total: results.length });
    } catch (error) {
      logger.error("Failed to search documentation", error);
      return formatMCPResponse({
        error: "Failed to search documentation",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  },
};
