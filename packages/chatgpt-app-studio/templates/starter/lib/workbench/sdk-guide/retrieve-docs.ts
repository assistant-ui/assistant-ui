import { SDK_DOCS_INDEX, type DocChunk } from "./docs-index";

interface ScoredChunk {
  chunk: DocChunk;
  score: number;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function computeScore(chunk: DocChunk, queryTokens: string[]): number {
  let score = 0;
  const contentLower = chunk.content.toLowerCase();
  const headingLower = chunk.heading.toLowerCase();

  for (const token of queryTokens) {
    if (chunk.keywords.includes(token)) {
      score += 3;
    }

    if (headingLower.includes(token)) {
      score += 2;
    }

    const contentMatches = contentLower.split(token).length - 1;
    score += Math.min(contentMatches, 5);
  }

  const exactPhraseBonus =
    queryTokens.length > 1 && contentLower.includes(queryTokens.join(" "))
      ? 5
      : 0;
  score += exactPhraseBonus;

  return score;
}

export function retrieveRelevantDocs(
  query: string,
  maxChunks: number = 5,
  minScore: number = 2,
): DocChunk[] {
  if (!query.trim()) {
    return [];
  }

  const queryTokens = tokenize(query);

  if (queryTokens.length === 0) {
    return [];
  }

  const scored: ScoredChunk[] = SDK_DOCS_INDEX.map((chunk) => ({
    chunk,
    score: computeScore(chunk, queryTokens),
  }));

  return scored
    .filter((s) => s.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxChunks)
    .map((s) => s.chunk);
}

export function formatDocsForPrompt(chunks: DocChunk[]): string {
  if (chunks.length === 0) {
    return "";
  }

  return chunks
    .map((chunk) => {
      return `### ${chunk.source}: ${chunk.heading}\n\n${chunk.content}`;
    })
    .join("\n\n---\n\n");
}
