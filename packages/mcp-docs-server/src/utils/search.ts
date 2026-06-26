import { join } from "node:path";
import { DOCS_PATH, MDX_EXTENSION } from "../constants.js";
import { getAvailablePaths, pathExists } from "./paths.js";
import { readMDXFile } from "./mdx.js";

const SCORE_WEIGHTS = {
  FULL_QUERY: { title: 10, path: 8, description: 5 },
  TOKEN: { title: 3, path: 2, description: 1, content: 0.5 },
} as const;

interface IndexEntry {
  path: string;
  title: string;
  description: string;
  content: string;
  excerpt: string;
}

export interface SearchResult {
  path: string;
  title: string;
  snippet: string;
}

let indexPromise: Promise<IndexEntry[]> | null = null;

function deriveTitle(
  path: string,
  frontmatter: Record<string, unknown>,
): string {
  const fmTitle = frontmatter["title"];
  if (typeof fmTitle === "string" && fmTitle.trim()) return fmTitle;
  return path.split("/").pop() ?? path;
}

async function buildIndex(): Promise<IndexEntry[]> {
  const paths = await getAvailablePaths();
  const entries = await Promise.all(
    paths.map(async (path): Promise<IndexEntry | null> => {
      const filePath = join(DOCS_PATH, `${path}${MDX_EXTENSION}`);
      if (!(await pathExists(filePath))) return null;
      const mdx = await readMDXFile(filePath);
      if (!mdx) return null;
      const description = mdx.frontmatter["description"];
      return {
        path,
        title: deriveTitle(path, mdx.frontmatter),
        description: typeof description === "string" ? description : "",
        content: mdx.content,
        excerpt: mdx.excerpt ?? "",
      };
    }),
  );
  return entries.filter((entry): entry is IndexEntry => entry !== null);
}

function getIndex(): Promise<IndexEntry[]> {
  if (!indexPromise) {
    indexPromise = buildIndex().catch((error) => {
      indexPromise = null;
      throw error;
    });
  }
  return indexPromise;
}

function makeSnippet(
  content: string,
  tokens: string[],
  excerpt: string,
): string {
  const lower = content.toLowerCase();
  for (const token of tokens) {
    const idx = lower.indexOf(token);
    if (idx >= 0) {
      const start = Math.max(0, idx - 60);
      const end = Math.min(content.length, idx + token.length + 100);
      const slice = content.slice(start, end).replace(/\s+/g, " ").trim();
      return `${start > 0 ? "…" : ""}${slice}${end < content.length ? "…" : ""}`;
    }
  }
  if (excerpt) return excerpt.slice(0, 160);
  const firstLine = content.split("\n").find((line) => line.trim());
  return firstLine ? firstLine.replace(/^#+\s*/, "").slice(0, 160) : "";
}

function scoreEntry(
  entry: IndexEntry,
  query: string,
  tokens: string[],
): number {
  const title = entry.title.toLowerCase();
  const path = entry.path.toLowerCase();
  const description = entry.description.toLowerCase();
  const content = entry.content.toLowerCase();

  let score = 0;
  if (title.includes(query)) score += SCORE_WEIGHTS.FULL_QUERY.title;
  if (path.includes(query)) score += SCORE_WEIGHTS.FULL_QUERY.path;
  if (description.includes(query))
    score += SCORE_WEIGHTS.FULL_QUERY.description;

  for (const token of tokens) {
    if (title.includes(token)) score += SCORE_WEIGHTS.TOKEN.title;
    if (path.includes(token)) score += SCORE_WEIGHTS.TOKEN.path;
    if (description.includes(token)) score += SCORE_WEIGHTS.TOKEN.description;
    if (content.includes(token)) score += SCORE_WEIGHTS.TOKEN.content;
  }
  return score;
}

export async function searchDocs(
  query: string,
  limit = 10,
): Promise<SearchResult[]> {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  const tokens = normalized.split(/\s+/).filter(Boolean);

  const index = await getIndex();
  return index
    .map((entry) => ({ entry, score: scoreEntry(entry, normalized, tokens) }))
    .filter((scored) => scored.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ entry }) => ({
      path: entry.path,
      title: entry.title,
      snippet: makeSnippet(entry.content, tokens, entry.excerpt),
    }));
}
