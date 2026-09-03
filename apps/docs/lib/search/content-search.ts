import { scoreText, tokenize } from "./query";
import type { SearchRecord } from "./types";

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
  const tokens = tokenize(query);
  if (tokens.length === 0 || limit <= 0) return [];

  const ranked: { match: ContentMatch; score: number }[] = [];

  for (const page of records) {
    const titleScore = scoreText(page.title, tokens);
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
      descriptionScore * 2 +
      Math.min(bodyScore, 12);
    if (score === 0) continue;

    const chosen = [...paragraphs]
      .sort((a, b) => b.score - a.score || a.order - b.order)
      .slice(0, EXCERPT_PARAGRAPHS)
      .sort((a, b) => a.order - b.order);
    const excerpt = (chosen.length > 0 ? chosen : paragraphs)
      .map((entry) => entry.text)
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
