import { describe, expect, it } from "vitest";
import type { SearchRecord } from "@/lib/search/types";
import { searchDocs } from "./search-docs";

const records: SearchRecord[] = [
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
];

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
