import { scoreText, tokenize } from "./query";
import type { SearchRecord } from "./types";

// `tokenize` only drops single characters, and `scoreText` requires every token,
// so a tool asking a natural-language question would otherwise have to find all
// of its filler words on one page.
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

/**
 * A page with the prose fumadocs already extracted for the search index.
 *
 * This shape is server only. The browser index served by `/api/search` carries
 * metadata alone so that the payload stays small, which is why the site's own
 * search box can only match a page body once you are already on that page.
 */
export type ContentRecord = SearchRecord & {
  contents: string[];
};

export type ContentMatch = {
  url: string;
  title: string;
  description: string;
  headings: string[];
  excerpt?: string;
};

const EXCERPT_LENGTH = 600;
// The fallback ranks once per token, so a long question does not turn into a
// full corpus scan per word.
const FALLBACK_TOKENS = 6;
const EXCERPT_PARAGRAPHS = 3;

/**
 * Ranks pages over their prose as well as their metadata, and returns the
 * paragraphs that matched as the excerpt.
 *
 * The weights follow the browser ranking (title, then headings, then
 * description) so that a query behaves the same on both surfaces; body text
 * scores below all three, since a page about a term outranks a page that
 * mentions it once.
 */
export function searchContent(
  records: readonly ContentRecord[],
  query: string,
  limit: number,
): ContentMatch[] {
  const all = tokenize(query).filter((token) => !STOP_WORDS.has(token));
  if (all.length === 0 || limit <= 0) return [];

  const ranked = rank(records, all, limit);
  if (ranked.length > 0 || all.length === 1) return ranked;

  // Every token has to appear on one page, so a specific question can rank
  // nothing at all. Falling back to the pages each token finds on its own,
  // ordered by how many tokens found them, answers it with something.
  const perToken = new Map<string, { match: ContentMatch; hits: number }>();
  for (const token of all.slice(0, FALLBACK_TOKENS)) {
    for (const match of rank(records, [token], limit)) {
      const seen = perToken.get(match.url);
      if (!seen) {
        perToken.set(match.url, { match, hits: 1 });
        continue;
      }
      seen.hits += 1;
      // A later token may be the one that matched prose, and its excerpt says
      // more than the lead paragraph an earlier metadata match settled for.
      const matched = (entry: ContentMatch, term: string) =>
        entry.excerpt?.toLowerCase().includes(term) ?? false;
      if (matched(match, token) && !matched(seen.match, token)) {
        seen.match = match;
      }
    }
  }

  return [...perToken.values()]
    .sort((a, b) => b.hits - a.hits)
    .slice(0, limit)
    .map((entry) => entry.match);
}

function rank(
  records: readonly ContentRecord[],
  tokens: string[],
  limit: number,
): ContentMatch[] {
  const ranked: { match: ContentMatch; score: number }[] = [];

  for (const page of records) {
    const titleScore = scoreText(page.title, tokens);
    // The old MCP filter matched the url, and a path term is often the most
    // specific thing a caller knows, so slugs still rank.
    const urlScore = scoreText(page.url.replace(/[/-]/g, " "), tokens);
    const descriptionScore = scoreText(page.description, tokens);
    const headingScore = Math.max(
      0,
      ...page.headings.map((heading) => scoreText(heading.content, tokens)),
    );

    const paragraphs = page.contents
      .map((text, order) => ({ text, order, score: scoreText(text, tokens) }))
      .filter((entry) => entry.score > 0);
    const bodyScore = paragraphs.reduce(
      (total, entry) => total + entry.score,
      0,
    );

    const score =
      titleScore * 8 +
      headingScore * 3 +
      urlScore * 3 +
      descriptionScore * 2 +
      Math.min(bodyScore, 12);
    if (score === 0) continue;

    const chosen = [...paragraphs]
      .sort((a, b) => b.score - a.score || a.order - b.order)
      .slice(0, EXCERPT_PARAGRAPHS)
      .sort((a, b) => a.order - b.order);
    const excerpt = (
      chosen.length > 0
        ? chosen.map((entry) => entry.text)
        : page.contents.slice(0, 1)
    )
      .join(" ")
      .slice(0, EXCERPT_LENGTH);

    ranked.push({
      score,
      match: {
        url: page.url,
        title: page.title,
        description: page.description,
        headings: page.headings.map((heading) => heading.content),
        ...(excerpt ? { excerpt } : {}),
      },
    });
  }

  return ranked
    .sort((a, b) => b.score - a.score || a.match.url.localeCompare(b.match.url))
    .slice(0, limit)
    .map((entry) => entry.match);
}
