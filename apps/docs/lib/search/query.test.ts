import { describe, expect, it } from "vitest";
import {
  highlightMatches,
  searchEntries,
  searchOtherPages,
  scoreText,
  tokenize,
} from "./query";
import type { SearchRecord } from "./types";

const records: SearchRecord[] = [
  {
    url: "/elements/thread",
    title: "Thread",
    description: "The main conversation surface.",
    headings: [
      { id: "root", content: "Thread.Root" },
      { id: "viewport", content: "Thread.Viewport" },
    ],
  },
  {
    url: "/docs/runtimes/ai-sdk",
    title: "AI SDK",
    description: "Use the Vercel AI SDK runtime.",
    headings: [{ id: "use-chat", content: "useChatRuntime" }],
  },
];

describe("tokenize", () => {
  it("splits on spaces and punctuation", () => {
    expect(tokenize("use-chat runtime")).toEqual(["use", "chat", "runtime"]);
  });

  it("drops single-character tokens", () => {
    expect(tokenize("s")).toEqual([]);
    expect(tokenize("ai sdk")).toEqual(["ai", "sdk"]);
  });
});

describe("scoreText", () => {
  it("requires every token", () => {
    expect(scoreText("Thread.Root", ["thread", "missing"])).toBe(0);
  });

  it("rewards word starts over mid-token matches", () => {
    expect(scoreText("useChatRuntime", ["chat"])).toBeGreaterThan(
      scoreText("useChatRuntime", ["hat"]),
    );
  });
});

describe("searchOtherPages", () => {
  it("keeps the current page out of other-page results", () => {
    const groups = searchOtherPages(records, "thread", "/elements/thread");
    expect(groups.map((group) => group.pageUrl)).toEqual([]);
  });

  it("ranks a title match above a heading-only match", () => {
    const groups = searchOtherPages(records, "thread", "/docs");
    expect(groups[0]?.pageUrl).toBe("/elements/thread");
    expect(groups[0]?.items[0]?.type).toBe("page");
  });

  it("includes matching headings under the page", () => {
    const groups = searchOtherPages(records, "viewport", "/docs");
    expect(groups[0]?.items.map((item) => item.content)).toEqual([
      "Thread",
      "Thread.Viewport",
    ]);
  });
});

describe("searchEntries", () => {
  it("returns on-page heading hits first", () => {
    const hits = searchEntries(
      [
        {
          id: "heading",
          url: "/elements/thread#root",
          content: "Thread.Root",
          type: "heading",
        },
        {
          id: "text",
          url: "/elements/thread#root",
          content: "Wraps the thread primitives.",
          type: "text",
        },
      ],
      "thread",
    );

    expect(hits[0]?.type).toBe("heading");
  });
});

describe("highlightMatches", () => {
  it("marks every token", () => {
    expect(highlightMatches("useChatRuntime", ["chat", "runtime"])).toEqual([
      { type: "text", content: "use" },
      { type: "text", content: "Chat", styles: { highlight: true } },
      { type: "text", content: "Runtime", styles: { highlight: true } },
    ]);
  });

  it("does not chip single letters", () => {
    expect(highlightMatches("assistant-ui", ["s"])).toEqual([
      { type: "text", content: "assistant-ui" },
    ]);
  });
});
