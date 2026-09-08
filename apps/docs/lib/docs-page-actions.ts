import { BASE_URL } from "./constants";

export const DOCS_MCP_URL = `${BASE_URL}/mcp`;

export const CODEX_URL = "https://chatgpt.com/codex/";

export async function copyTextToClipboard(value: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {}
  }

  if (typeof document === "undefined") return false;

  const textArea = document.createElement("textarea");
  textArea.value = value;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.select();

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    textArea.remove();
  }
}

export function getClaudePageUrl(markdownUrl: string, title: string): string {
  const pageUrl = `${BASE_URL}${markdownUrl}`;
  const prompt = `Read ${pageUrl} (the assistant-ui documentation page "${title}") so I can ask questions about it.`;

  return `https://claude.ai/new?q=${encodeURIComponent(prompt)}`;
}
