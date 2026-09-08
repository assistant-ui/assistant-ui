import { describe, expect, it } from "vitest";
import { CODEX_URL, DOCS_MCP_URL, getClaudePageUrl } from "./docs-page-actions";

describe("docs page actions", () => {
  it("uses the hosted documentation MCP endpoint", () => {
    expect(DOCS_MCP_URL).toBe("https://www.assistant-ui.com/mcp");
  });

  it("opens the official Codex web app", () => {
    expect(CODEX_URL).toBe("https://chatgpt.com/codex/");
  });

  it("opens Claude with the current Markdown page", () => {
    const url = new URL(
      getClaudePageUrl("/docs/runtimes/local.md", "Local Runtime & Hooks"),
    );

    expect(url.origin).toBe("https://claude.ai");
    expect(url.pathname).toBe("/new");
    expect(url.searchParams.get("q")).toBe(
      'Read https://www.assistant-ui.com/docs/runtimes/local.md (the assistant-ui documentation page "Local Runtime & Hooks") so I can ask questions about it.',
    );
  });
});
