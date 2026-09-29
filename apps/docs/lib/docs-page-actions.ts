import { BASE_URL } from "./constants";

export const DOCS_MCP_URL = `${BASE_URL}/mcp`;

export const CODEX_URL = "https://chatgpt.com/codex/";

export function getClaudePageUrl(markdownUrl: string, title: string): string {
  const pageUrl = `${BASE_URL}${markdownUrl}`;
  const prompt = `Read ${pageUrl} (the assistant-ui documentation page "${title}") so I can ask questions about it.`;

  return `https://claude.ai/new?q=${encodeURIComponent(prompt)}`;
}
