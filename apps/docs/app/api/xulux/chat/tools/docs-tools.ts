import { tool, zodSchema } from "ai";
import z from "zod";

export function createDocsTools({ routeUrl }: { routeUrl: string }) {
  return {
    listDocs: tool({
      description:
        "List documentation pages. Use with no path for root categories, or specify path to browse a section.",
      inputSchema: zodSchema(
        z.object({
          path: z
            .string()
            .optional()
            .describe("Subpath to browse. Omit to list root categories first."),
        }),
      ),
      execute: async ({ path }) => {
        const { listDocs } = await import("@/lib/ai/docs-tools");
        return listDocs(path);
      },
    }),
    readDoc: tool({
      description: "Read full content of a documentation page.",
      inputSchema: zodSchema(
        z.object({
          slugOrUrl: z
            .string()
            .describe(
              "Page slug (e.g., 'examples/ai-sdk', 'elements/thread') or URL",
            ),
        }),
      ),
      execute: async ({ slugOrUrl }) => {
        const { readDoc } = await import("@/lib/ai/docs-tools");
        return readDoc(slugOrUrl, routeUrl);
      },
    }),
  };
}
