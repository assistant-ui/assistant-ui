import { searchContent } from "@/lib/search/content-search";
import { tool, zodSchema, type UIMessageStreamWriter } from "ai";
import z from "zod";

const RESULT_LIMIT = 5;

async function getContentIndex() {
  const { buildContentIndex } = await import("@/lib/search/content-index");
  return buildContentIndex();
}

export function createSearchDocsTool({
  writer,
  origin,
}: {
  writer: UIMessageStreamWriter;
  origin: string;
}) {
  return tool({
    description:
      "Search the assistant-ui documentation for APIs, components, runtimes, setup, and usage guidance.",
    inputSchema: zodSchema(
      z.object({
        query: z
          .string()
          .describe(
            "A short phrase of distinctive documentation terms, with filler words omitted.",
          ),
      }),
    ),
    execute: async ({ query }) => {
      const pages = searchContent(await getContentIndex(), query, RESULT_LIMIT);
      const results = pages.map((page) => ({
        ...page,
        url: new URL(page.url, origin).href,
      }));

      for (const page of results) {
        writer.write({
          type: "source-url",
          sourceId: page.url,
          url: page.url,
          title: page.title,
        });
      }

      return { results };
    },
  });
}
