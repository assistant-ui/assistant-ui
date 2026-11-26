import { z } from "zod";
import { checkDocsSearchRateLimit } from "@/lib/rate-limit";
import { buildContentIndex } from "@/lib/search/content-index";
import { searchContent, type ContentRecord } from "@/lib/search/content-search";
import { searchablePages } from "@/lib/search/corpus";
import {
  inSearchScope,
  SEARCH_SCOPES,
  type RoutePage,
  type SearchScope,
} from "@/lib/search/route-query";
import { createDocsRouteSearch } from "@/lib/search/route-search";
import { createSpellingCorrector } from "@/lib/search/spelling";

const input = z.object({
  query: z.string().trim().min(4).max(120),
  scope: z.enum(SEARCH_SCOPES).default("All"),
});

// Pages whose body text has every word of the query. The browser index holds
// only titles, descriptions and headings, so these are the matches it misses.
// A query that matches nothing is retried once with misspelled words corrected
// to the closest word in the docs.
const TEXT_MATCH_LIMIT = 5;

let corrector:
  | { records: ContentRecord[]; correct: (query: string) => string | undefined }
  | undefined;

async function textMatches(query: string, scope: SearchScope) {
  const index = await buildContentIndex();
  const records = index.filter((page) => inSearchScope(page.url, scope));
  const find = (text: string) =>
    searchContent(records, text, TEXT_MATCH_LIMIT, { anyToken: false });

  let matches = find(query);
  if (matches.length === 0) {
    if (corrector?.records !== index) {
      corrector = { records: index, correct: createSpellingCorrector(index) };
    }
    const corrected = corrector.correct(query);
    if (corrected) matches = find(corrected);
  }
  return matches.map(({ url, title, description }) => ({
    url,
    title,
    description,
  }));
}

let search: ReturnType<typeof createDocsRouteSearch> | undefined;

export async function GET(request: Request) {
  const params = input.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!params.success) return new Response("Invalid search", { status: 400 });
  const { query, scope } = params.data;

  const json = (pages: RoutePage[]) =>
    Response.json(
      { pages, enabled: true },
      {
        headers: {
          "Cache-Control": "no-store",
          "X-Robots-Tag": "noindex",
        },
      },
    );
  const apiKey = process.env.JEV_KEY;
  if (!apiKey) return json(await textMatches(query, scope));

  const limited = await checkDocsSearchRateLimit(request);
  if (limited) return limited;

  search ??= createDocsRouteSearch({
    apiKey,
    pages: searchablePages().map((page) => ({
      url: page.url,
      title: page.data.title,
      description: page.data.description ?? "",
    })),
  });
  const [chosen, text] = await Promise.all([
    search(query, scope, request.signal),
    textMatches(query, scope),
  ]);
  const seen = new Set(chosen.map((page) => page.url));
  return json([...chosen, ...text.filter((page) => !seen.has(page.url))]);
}
