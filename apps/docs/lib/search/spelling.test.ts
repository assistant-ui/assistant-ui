import { describe, expect, it } from "vitest";
import type { ContentRecord } from "./content-search";
import { createSpellingCorrector, editDistance } from "./spelling";

const page = (contents: string[]): ContentRecord => ({
  url: "/docs/x",
  title: "Attachments",
  description: "Upload files and images",
  headings: [{ id: "markdown", content: "Render markdown" }],
  contents,
});

const correct = createSpellingCorrector([
  page([
    "Search the thread history. Use ToolFallback for unknown tools.",
    "Add an attachment to a message.",
    "Set the thinking level on each request.",
  ]),
]);

describe("editDistance", () => {
  it("counts an adjacent swap as one edit", () => {
    expect(editDistance("serach", "search", 2)).toBe(1);
    expect(editDistance("attchment", "attachment", 2)).toBe(1);
    expect(editDistance("theme", "thread", 1)).toBe(2);
  });
});

describe("createSpellingCorrector", () => {
  it.each([
    ["serach", "search"],
    ["attchment", "attachment"],
    ["markdwon", "markdown"],
    ["tollfallback", "toolfallback"],
    ["thinking levle", "thinking level"],
  ])("corrects %s to %s", (query, expected) => {
    expect(correct(query)).toBe(expected);
  });

  it("drops punctuation around a word before correcting it", () => {
    expect(correct("serach?")).toBe("search");
    expect(correct("(thread)")).toBe("thread");
  });

  it("leaves words that are in the docs, or typed in part, alone", () => {
    expect(correct("thread history")).toBeUndefined();
    expect(correct("attach")).toBeUndefined();
  });

  it("leaves words with no close match alone", () => {
    expect(correct("kubernetes")).toBeUndefined();
  });

  it("corrects only words of five letters or more, by one edit", () => {
    expect(correct("thred")).toBe("thread");
    expect(correct("thrd")).toBeUndefined();
    expect(correct("v0.15")).toBeUndefined();
    expect(correct("serahc")).toBeUndefined();
  });

  it("keeps the first letter", () => {
    expect(correct("ghread")).toBeUndefined();
  });
});
