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
    if (index === -1) return 0;
    if (hay === token) score += 10;
    else if (isWordStart(text, index)) score += 4;
    else score += 1;
  }

  return score;
}

export function highlightMatches(
  text: string,
  tokens: string[],
): HighlightSegment[] {
  const unique = [...new Set(tokens.filter((token) => token.length > 1))];
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
  const tokens = tokenize(query);
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

export function searchOtherPages(
  records: SearchRecord[],
  query: string,
  pathname: string,
): SearchGroup[] {
  const tokens = tokenize(query);
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
      titleScore * 8 + descriptionScore * 2 + (headingHits[0]?.score ?? 0) * 3;
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
