import { describe, expect, it, vi } from "vitest";
import type { ContentRecord } from "@/lib/search/content-search";

const mocks = vi.hoisted(() => ({
  records: [
    {
      url: "/docs/ui/thread-list",
      title: "Thread List",
      description: "Render and manage conversation history.",
      headings: [{ id: "usage", content: "Usage" }],
      contents: [
        "An unrelated opening paragraph.",
        "Render the thread list beside your thread.",
      ],
    },
    {
      url: "/docs/runtimes/custom",
      title: "Custom Runtime",
      description: "Connect an external store.",
      headings: [{ id: "thread-list", content: "Thread List" }],
      contents: ["Wire an external store into the runtime."],
    },
    {
      url: "/docs/guides/keyboard",
      title: "Keyboard",
      description: "Shortcuts.",
      headings: [],
      contents: [
        "Press the escape key to dismiss the composer autocomplete popover.",
      ],
    },
  ] satisfies ContentRecord[],
}));

vi.mock("@/lib/search/content-index", () => ({
  buildContentIndex: () => Promise.resolve(mocks.records),
}));

import { searchContent } from "@/lib/search/content-search";
import { createSearchDocsTool } from "./search-docs";

describe("searchContent", () => {
  it("ranks a title match above a heading-only match", () => {
    expect(
      searchContent(mocks.records, "thread list", 5).map((page) => page.url),
    ).toEqual(["/docs/ui/thread-list", "/docs/runtimes/custom"]);
  });

  it("finds a page whose terms appear only in its body", () => {
    expect(
      searchContent(mocks.records, "dismiss the popover", 5).map(
        (page) => page.url,
      ),
    ).toEqual(["/docs/guides/keyboard"]);
  });

  it("excerpts the paragraphs that matched", () => {
    expect(searchContent(mocks.records, "thread list", 1)[0]?.excerpt).toBe(
      "Render the thread list beside your thread.",
    );
  });

  it("ignores filler words in a natural-language question", () => {
    expect(
      searchContent(mocks.records, "how do I render a thread list", 5).map(
        (page) => page.url,
      ),
    ).toEqual(["/docs/ui/thread-list"]);
  });

  it("falls back to the pages each term finds when no page has them all", () => {
    expect(
      searchContent(mocks.records, "thread list keyboard escape", 5).map(
        (page) => page.url,
      ),
    ).toEqual([
      "/docs/ui/thread-list",
      "/docs/runtimes/custom",
      "/docs/guides/keyboard",
    ]);
  });

  it("matches a term that appears only in the url", () => {
    expect(
      searchContent(mocks.records, "runtimes custom", 5).map(
        (page) => page.url,
      ),
    ).toEqual(["/docs/runtimes/custom"]);
  });

  it("still returns an excerpt for a page matched on metadata alone", () => {
    expect(searchContent(mocks.records, "keyboard", 1)[0]?.excerpt).toBe(
      "Press the escape key to dismiss the composer autocomplete popover.",
    );
  });

  it("caps results at the limit", () => {
    expect(searchContent(mocks.records, "thread", 1)).toHaveLength(1);
  });

  it("returns nothing for a query of only filler", () => {
    expect(searchContent(mocks.records, "   ", 5)).toEqual([]);
  });
});

describe("createSearchDocsTool", () => {
  it("writes one absolute source part per returned page", async () => {
    const written: unknown[] = [];
    const tool = createSearchDocsTool({
      writer: { write: (part: unknown) => written.push(part) } as never,
      origin: "https://www.assistant-ui.com",
    });

    const output = (await tool.execute!(
      { query: "thread list" },
      {
        toolCallId: "1",
        messages: [],
      },
    )) as { results: { url: string; title: string; excerpt?: string }[] };

    expect(output.results.map((page) => page.url)).toEqual([
      "https://www.assistant-ui.com/docs/ui/thread-list",
      "https://www.assistant-ui.com/docs/runtimes/custom",
    ]);
    expect(output.results[0]?.excerpt).toBe(
      "Render the thread list beside your thread.",
    );
    expect(written).toEqual(
      output.results.map((page) => ({
        type: "source-url",
        sourceId: page.url,
        url: page.url,
        title: page.title,
      })),
    );
  });
});
