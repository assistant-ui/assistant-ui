import { searchOtherPages, tokenize } from "@/lib/search/query";
import type { SearchGroup, SearchRecord } from "@/lib/search/types";
import { tool, zodSchema, type UIMessageStreamWriter } from "ai";
import z from "zod";

const STOP_WORDS = new Set([
  "about",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "can",
  "do",
  "does",
  "for",
  "from",
  "how",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "should",
  "that",
  "the",
  "this",
  "to",
  "was",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "with",
  "would",
  "you",
  "your",
]);

type SearchDocsResult = {
  url: string;
  title: string;
  description: string;
  headings: string[];
  matches: string[];
};

export function searchDocs(
  records: SearchRecord[],
  query: string,
  limit: number,
): SearchDocsResult[] {
  const tokens = tokenize(query).filter((token) => !STOP_WORDS.has(token));
  if (tokens.length === 0 || limit <= 0) return [];

  const recordsByUrl = new Map<string, SearchRecord>();
  for (const record of records) {
    if (!recordsByUrl.has(record.url)) recordsByUrl.set(record.url, record);
  }

  const pages = [...recordsByUrl.values()];
  const rank = (terms: string[]) =>
    searchOtherPages(pages, terms.join(" "), "");

  let groups = rank(tokens);
  if (groups.length === 0 && tokens.length > 1) {
    const partial = new Map<string, { group: SearchGroup; hits: number }>();
    for (const token of tokens) {
      for (const group of rank([token])) {
        const entry = partial.get(group.pageUrl);
        if (entry) entry.hits += 1;
        else partial.set(group.pageUrl, { group, hits: 1 });
      }
    }
    groups = [...partial.values()]
      .sort((a, b) => b.hits - a.hits)
      .map((entry) => entry.group);
  }

  return groups.slice(0, limit).flatMap((group) => {
    const record = recordsByUrl.get(group.pageUrl);
    if (!record) return [];
    return {
      url: record.url,
      title: record.title,
      description: record.description,
      headings: record.headings.map((heading) => heading.content),
      matches: group.items
        .filter((item) => item.type !== "page")
        .slice(0, 4)
        .map((item) => item.content.replace(/\s+/g, " ").trim().slice(0, 300)),
    };
  });
}

let searchIndexPromise: Promise<SearchRecord[]> | undefined;

function getSearchIndex() {
  searchIndexPromise ??= import("@/lib/search/pages")
    .then(({ buildSearchIndex }) => buildSearchIndex())
    .catch((error: unknown) => {
      searchIndexPromise = undefined;
      throw error;
    });
  return searchIndexPromise;
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
      const pages = searchDocs(await getSearchIndex(), query, 5);
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
