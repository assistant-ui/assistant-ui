import { describe, expect, it } from "vitest";
import { searchContent, type ContentRecord } from "./content-search";

const records: ContentRecord[] = [
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
];

describe("searchContent", () => {
  it("ranks a title match above a heading-only match", () => {
    expect(
      searchContent(records, "thread list", 5).map((page) => page.url),
    ).toEqual(["/docs/ui/thread-list", "/docs/runtimes/custom"]);
  });

  it("finds a page whose terms appear only in its body", () => {
    expect(
      searchContent(records, "dismiss the popover", 5).map((page) => page.url),
    ).toEqual(["/docs/guides/keyboard"]);
  });

  it("excerpts the paragraphs that matched", () => {
    expect(searchContent(records, "thread list", 1)[0]?.excerpt).toBe(
      "Render the thread list beside your thread.",
    );
  });

  it("ignores filler words in a natural-language question", () => {
    expect(
      searchContent(records, "how do I render a thread list", 5).map(
        (page) => page.url,
      ),
    ).toEqual(["/docs/ui/thread-list"]);
  });

  it("falls back to the pages each term finds when no page has them all", () => {
    expect(
      searchContent(records, "thread list keyboard escape", 5).map(
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
      searchContent(records, "runtimes custom", 5).map((page) => page.url),
    ).toEqual(["/docs/runtimes/custom"]);
  });

  it("still returns an excerpt for a page matched on metadata alone", () => {
    expect(searchContent(records, "keyboard", 1)[0]?.excerpt).toBe(
      "Press the escape key to dismiss the composer autocomplete popover.",
    );
  });

  it("caps results at the limit", () => {
    expect(searchContent(records, "thread", 1)).toHaveLength(1);
  });

  it("returns nothing for a query of only filler", () => {
    expect(searchContent(records, "   ", 5)).toEqual([]);
  });
});
