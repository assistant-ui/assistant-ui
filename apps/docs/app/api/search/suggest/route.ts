import { z } from "zod";
import { checkDocsSearchRateLimit } from "@/lib/rate-limit";
import { buildContentIndex } from "@/lib/search/content-index";
import { searchContent, type ContentRecord } from "@/lib/search/content-search";
import { searchablePages } from "@/lib/search/corpus";
import { scoreText, tokenize } from "@/lib/search/query";
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

// Pages with a body paragraph that has every word of the query, leaving out
// pages the browser index already lists from their title, description or
// headings. A query that matches nothing anywhere is retried once with
// misspelled words corrected to the closest word in the docs.
const TEXT_MATCH_LIMIT = 5;

let corrector:
  | { records: ContentRecord[]; correct: (query: string) => string | undefined }
  | undefined;

const listedLocally = (page: ContentRecord, tokens: string[]) =>
  [
    page.title,
    page.description,
    ...page.headings.map((heading) => heading.content),
  ].some((text) => scoreText(text, tokens) > 0);

async function findTextMatches(query: string, scope: SearchScope) {
  const index = await buildContentIndex();
  const records = index.filter((page) => inSearchScope(page.url, scope));
  const tokens = tokenize(query);
  const unlisted = records.filter((page) => !listedLocally(page, tokens));
  const find = (pages: ContentRecord[], text: string) =>
    searchContent(pages, text, TEXT_MATCH_LIMIT, { anyToken: false });

  let matches = find(unlisted, query);
  if (matches.length === 0 && unlisted.length === records.length) {
    if (corrector?.records !== index) {
      corrector = { records: index, correct: createSpellingCorrector(index) };
    }
    const corrected = corrector.correct(query);
    if (corrected) matches = find(records, corrected);
  }
  return matches.map(({ url, title, description }) => ({
    url,
    title,
    description,
  }));
}

// A broken content index must not take Jev's picks down with it.
async function textMatches(query: string, scope: SearchScope) {
  try {
    return await findTextMatches(query, scope);
  } catch (error) {
    console.error("docs search: body-text matches failed", error);
    return [];
  }
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
  // The search limits cover the whole route. A limiter that is unavailable
  // (503) only skips the paid Jev call; body-text matches still run.
  const limited = await checkDocsSearchRateLimit(request);
  if (limited?.status === 429) return limited;
  const apiKey = process.env.JEV_KEY;
  if (!apiKey || limited) return json(await textMatches(query, scope));

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
