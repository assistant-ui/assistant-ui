import type {
  HighlightSegment,
  SearchGroup,
  SearchHit,
  SearchRecord,
} from "./types";

export const ON_PAGE_LIMIT = 12;
export const OTHER_PAGE_LIMIT = 16;
export const HEADINGS_PER_PAGE = 3;

export function normalizePath(path: string): string {
  const bare = path.split("#")[0] ?? "";
  if (bare.length > 1 && bare.endsWith("/")) return bare.slice(0, -1);
  return bare;
}

export function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[\s/._-]+/)
    .filter((token) => token.length > 1);
}

// Every token must match, so filler words would make a question such as
// "state of the thread" miss the page titled "Thread State".
export const STOP_WORDS: ReadonlySet<string> = new Set([
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
 * The tokens a search must match: `tokenize` without stop words, unless the
 * query has nothing else ("how to" still searches for itself).
 */
export function searchTokens(query: string): string[] {
  const tokens = tokenize(query);
  const kept = tokens.filter((token) => !STOP_WORDS.has(token));
  return kept.length > 0 ? kept : tokens;
}

// Suffixes dropped to find a word's stem, longest first, so "theming",
// "themes" and "theme" all reach "them".
const SUFFIXES = [
  "ations",
  "ation",
  "ings",
  "ing",
  "ers",
  "ies",
  "ed",
  "es",
  "er",
  "s",
  "e",
  "y",
];
const MIN_STEM = 4;
// Common words a stem can spell on its own; "theme" must not match "them".
const STEM_WORDS = new Set([
  "them",
  "then",
  "they",
  "there",
  "these",
  "this",
  "were",
  "will",
  "your",
]);

/** The token minus one inflection suffix, or undefined if too short to stem. */
export function stem(token: string): string | undefined {
  if (!/^[a-z]+$/.test(token)) return undefined;
  for (const suffix of SUFFIXES) {
    if (token.length - suffix.length >= MIN_STEM && token.endsWith(suffix)) {
      return token.slice(0, -suffix.length);
    }
  }
  return undefined;
}

function isWordStart(text: string, index: number): boolean {
  if (index === 0) return true;
  const previous = text[index - 1] ?? "";
  if (/[\s/._-]/.test(previous)) return true;
  const current = text[index] ?? "";
  return (
    previous === previous.toLowerCase() && current === current.toUpperCase()
  );
}

export function scoreText(text: string, tokens: string[]): number {
  if (tokens.length === 0 || text.length === 0) return 0;

  const hay = text.toLowerCase();
  let score = 0;

  for (const token of tokens) {
    const index = hay.indexOf(token);
    if (index !== -1) {
      if (hay === token) score += 10;
      else if (isWordStart(text, index)) score += 4;
      else score += 1;
      continue;
    }
    // A word with the same stem is another form of the token: "theme" finds
    // "Theming", "styles" finds "Styling". It scores half a mid-word match, so
    // it mostly adds pages instead of reordering the ones the token finds.
    if (!sameStem(text, hay, token)) return 0;
    score += 0.5;
  }

  return score;
}

function sameStem(text: string, hay: string, token: string): boolean {
  const root = stem(token) ?? token;
  if (root.length < MIN_STEM || !hay.includes(root)) return false;
  // Split camelCase too, without a lookbehind (older Safari cannot parse one).
  const words = text
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/);
  for (const word of words) {
    const lower = word.toLowerCase();
    if (!STEM_WORDS.has(lower) && (stem(lower) ?? lower) === root) return true;
  }
  return false;
}

export function highlightMatches(
  text: string,
  tokens: string[],
): HighlightSegment[] {
  const unique = [
    ...new Set(
      tokens
        .filter((token) => token.length > 1)
        .flatMap((token) => [token, stem(token) ?? token]),
    ),
  ].sort((a, b) => b.length - a.length);
  if (unique.length === 0) return [{ type: "text", content: text }];

  const pattern = unique
    .map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const regex = new RegExp(`(${pattern})`, "gi");
  const segments: HighlightSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(regex)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      segments.push({ type: "text", content: text.slice(lastIndex, index) });
    }
    segments.push({
      type: "text",
      content: match[0] ?? "",
      styles: { highlight: true },
    });
    lastIndex = index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", content: text.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: "text", content: text }];
}

export function excerptAround(
  text: string,
  tokens: string[],
  radius = 48,
): string {
  const hay = text.toLowerCase();
  let index = -1;
  for (const token of tokens) {
    index = hay.indexOf(token);
    if (index !== -1) break;
  }
  if (index === -1) {
    return text.length > 100 ? `${text.slice(0, 100).trim()}…` : text;
  }

  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + (tokens[0]?.length ?? 0) + radius);
  const slice = text.slice(start, end).trim();
  return `${start > 0 ? "…" : ""}${slice}${end < text.length ? "…" : ""}`;
}

export function searchEntries(
  entries: Omit<SearchHit, "score">[],
  query: string,
  limit = ON_PAGE_LIMIT,
): SearchHit[] {
  const tokens = searchTokens(query);
  if (tokens.length === 0) return [];

  return entries
    .map((entry) => ({
      ...entry,
      score:
        scoreText(entry.content, tokens) *
        (entry.type === "heading" ? 4 : entry.type === "page" ? 8 : 2),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.content.localeCompare(b.content))
    .slice(0, limit);
}

/**
 * A question spreads its words over a page ("change the theme" finds a page
 * titled "Themes" with a heading "Change colors"). When no single field has
 * every word but the page as a whole does, it scores at most 1, below the
 * weakest single-field match of two or more words (two stem matches in a
 * description score 2).
 */
function spreadScore(page: SearchRecord, tokens: string[]): number {
  if (tokens.length < 2) return 0;
  const fields = [
    page.title,
    page.description,
    ...page.headings.map((heading) => heading.content),
  ];
  let score = 0;
  for (const token of tokens) {
    const best = Math.max(...fields.map((field) => scoreText(field, [token])));
    if (best === 0) return 0;
    score += best / (10 * tokens.length);
  }
  return score;
}

// A pasted docs link ("https://www.assistant-ui.com/docs/guides/branching")
// opens its page, or searches for its last segment when the page has moved.
const DOCS_LINK =
  /^https?:\/\/(?:www\.)?assistant-ui\.com(\/[^\s?#]*)?(?:\?[^\s#]*)?(?:#(\S*))?$/i;

export function searchOtherPages(
  records: SearchRecord[],
  query: string,
  pathname: string,
): SearchGroup[] {
  const link = DOCS_LINK.exec(query.trim());
  if (link) {
    const path = normalizePath(link[1] ?? "/");
    const page = records.find((record) => normalizePath(record.url) === path);
    if (page && normalizePath(pathname) !== path) {
      return [
        {
          pageUrl: page.url,
          items: [
            {
              id: page.url,
              url: page.url,
              content: page.title,
              type: "page",
              score: 1,
            },
          ],
        },
      ];
    }
    const rest = link[2] || path.split("/").pop() || "";
    return rest ? searchOtherPages(records, rest, pathname) : [];
  }

  const tokens = searchTokens(query);
  if (tokens.length === 0) return [];

  const current = normalizePath(pathname);
  const groups: Array<SearchGroup & { score: number }> = [];

  for (const page of records) {
    if (normalizePath(page.url) === current) continue;

    const titleScore = scoreText(page.title, tokens);
    const descriptionScore = scoreText(page.description, tokens);
    const headingHits = page.headings
      .map((heading) => ({
        heading,
        score: scoreText(heading.content, tokens),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    const pageScore =
      titleScore * 8 +
        descriptionScore * 2 +
        (headingHits[0]?.score ?? 0) * 3 || spreadScore(page, tokens);
    if (pageScore === 0) continue;

    const items: SearchHit[] = [
      {
        id: page.url,
        url: page.url,
        content: page.title,
        type: "page",
        score: pageScore,
      },
    ];

    for (const item of headingHits.slice(0, HEADINGS_PER_PAGE)) {
      const url = `${page.url}#${item.heading.id}`;
      items.push({
        id: url,
        url,
        content: item.heading.content,
        type: "heading",
        score: item.score,
      });
    }

    groups.push({ pageUrl: page.url, items, score: pageScore });
  }

  groups.sort(
    (a, b) => b.score - a.score || a.pageUrl.localeCompare(b.pageUrl),
  );

  const limited: SearchGroup[] = [];
  let count = 0;
  for (const group of groups) {
    if (count >= OTHER_PAGE_LIMIT) break;
    const items = group.items.slice(0, OTHER_PAGE_LIMIT - count);
    limited.push({ pageUrl: group.pageUrl, items });
    count += items.length;
  }

  return limited;
}
