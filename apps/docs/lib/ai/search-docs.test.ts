import { describe, expect, it, vi } from "vitest";
import type { SearchRecord } from "@/lib/search/types";
const mocks = vi.hoisted(() => ({
  records: [
    {
      url: "/docs/ui/thread-list",
      title: "Thread List",
      description: "Render and manage conversation history.",
      headings: [{ id: "usage", content: "Usage" }],
    },
    {
      url: "/docs/runtimes/custom",
      title: "Custom Runtime",
      description: "Connect an external store.",
      headings: [{ id: "thread-list", content: "Thread List" }],
    },
  ],
  pages: [
    {
      url: "/docs/ui/thread-list",
      data: {
        structuredData: () => ({
          contents: [
            { content: "An unrelated opening paragraph." },
            { content: "Render the thread list beside your thread." },
          ],
        }),
      },
    },
  ],
}));

vi.mock("@/lib/search/pages", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/search/pages")>()),
  buildSearchIndex: () => mocks.records,
}));

vi.mock("@/lib/source", () => ({
  source: { getPages: () => mocks.pages },
  getTapDocsPages: () => [],
  design: { getPages: () => [] },
  elementsDocs: { getPages: () => [] },
}));

import { createSearchDocsTool, searchDocs } from "./search-docs";

const records: SearchRecord[] = mocks.records;

describe("searchDocs", () => {
  it("ranks a title match above a heading-only match", () => {
    expect(
      searchDocs(records, "thread list", 5).map((page) => page.url),
    ).toEqual(["/docs/ui/thread-list", "/docs/runtimes/custom"]);
  });

  it("deduplicates urls", () => {
    expect(
      searchDocs([...records, records[0]!], "thread list", 5),
    ).toHaveLength(2);
  });

  it("caps results at the limit", () => {
    const matchingRecords = [
      ...records,
      {
        url: "/docs/ui/thread-list-item",
        title: "Thread List Item",
        description: "Render one thread.",
        headings: [],
      },
    ];

    expect(searchDocs(matchingRecords, "thread list", 2)).toHaveLength(2);
  });

  it("falls back to pages that match part of the query", () => {
    expect(
      searchDocs(records, "thread list runtime", 5).map((page) => page.url),
    ).toEqual(
      expect.arrayContaining(["/docs/ui/thread-list", "/docs/runtimes/custom"]),
    );
    expect(searchDocs(records, "thread list runtime", 5)).toHaveLength(2);
  });

  it("returns no results for empty or all-stopword queries", () => {
    expect(searchDocs(records, "", 5)).toEqual([]);
    expect(searchDocs(records, "the and or", 5)).toEqual([]);
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
    )) as { results: { url: string; title: string }[] };

    expect(output.results.map((page) => page.url)).toEqual([
      "https://www.assistant-ui.com/docs/ui/thread-list",
      "https://www.assistant-ui.com/docs/runtimes/custom",
    ]);
    expect(written).toEqual(
      output.results.map((page) => ({
        type: "source-url",
        sourceId: page.url,
        url: page.url,
        title: page.title,
      })),
    );
  });

  it("excerpts the paragraphs that match the query", async () => {
    const tool = createSearchDocsTool({
      writer: { write: () => {} } as never,
      origin: "https://www.assistant-ui.com",
    });

    const output = (await tool.execute!(
      { query: "thread list" },
      {
        toolCallId: "1",
        messages: [],
      },
    )) as { results: { url: string; excerpt?: string }[] };

    expect(output.results[0]?.excerpt).toBe(
      "Render the thread list beside your thread.",
    );
    expect(output.results[1]?.excerpt).toBeUndefined();
  });
});
