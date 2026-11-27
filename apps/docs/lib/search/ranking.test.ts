import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { searchOtherPages } from "./query";
import type { SearchRecord } from "./types";

// The most common docs searches (PostHog, Oct 27 to Nov 26, grouped by intent)
// and the page each one should find. The real index is rebuilt from the
// content, so a ranking change or a new page that pushes a target below the
// top three fails here instead of going unnoticed.
const EXPECTED: [query: string, page: string][] = [
  ["markdown", "/elements/markdown-text"],
  ["image", "/elements/image"],
  ["voice", "/docs/guides/voice"],
  ["skill", "/docs/llm"],
  ["chart", "/elements/chart"],
  ["reasoning", "/elements/reasoning"],
  ["mcp", "/docs/tools/mcp"],
  ["composer", "/elements/composer"],
  ["diff", "/design/components/diff-viewer"],
  ["timeline", "/elements/timeline"],
  ["file", "/elements/file"],
  ["thread", "/elements/thread"],
  ["error", "/docs/primitives/error"],
  ["theme", "/docs/guides/styling"],
  ["styling", "/docs/guides/styling"],
  ["orb", "/elements/orb"],
  ["citation", "/elements/inline-citation"],
  ["thinking", "/elements/thinking-indicator"],
  ["ag-ui", "/docs/runtimes/ag-ui/overview"],
  ["generative", "/docs/tools/generative-ui"],
  ["suggestion", "/docs/primitives/suggestion"],
  ["a2ui", "/docs/tools/a2ui"],
  ["code", "/design/components/code-block"],
  ["sources", "/elements/sources"],
  ["queue", "/elements/message-queue"],
  ["memory", "/elements/memory-chips"],
  ["artifact", "/elements/artifact-card"],
  ["lexical", "/docs/guides/mentions"],
  ["ComposerPrimitive", "/docs/api-reference/primitives/composer"],
  ["math", "/elements/math-block"],
  ["tools", "/docs/tools"],
  ["button", "/design/components/button"],
  ["todo", "/elements/todo-list"],
  ["feedback", "/docs/api-reference/adapters/feedback"],
  ["modal", "/elements/assistant-modal"],
  ["table", "/design/components/table"],
  ["empty", "/elements/empty-state"],
  ["streaming", "/elements/streaming-text"],
  ["useAui", "/docs/store/methods"],
  ["quote", "/elements/quote"],
  ["branching", "/docs/guides/branching"],
  ["dark mode", "/docs/guides/styling"],
  ["how to change the theme", "/docs/guides/styling"],
];

const root = fileURLToPath(new URL("../..", import.meta.url));
let index: SearchRecord[];

beforeAll(async () => {
  const { generateContentManifest } =
    await import("../../scripts/content/manifest.mts");
  await generateContentManifest(root);
  const { buildSearchIndex } = await import("./pages");
  index = await buildSearchIndex();
}, 60_000);

describe("docs search ranking", () => {
  it.each(EXPECTED)("%s finds %s in the top three", (query, page) => {
    const top = searchOtherPages(index, query, "/")
      .slice(0, 3)
      .map((group) => group.pageUrl);
    expect(top).toContain(page);
  });
});
