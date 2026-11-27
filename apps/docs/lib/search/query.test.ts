import { describe, expect, it } from "vitest";
import {
  highlightMatches,
  searchEntries,
  searchOtherPages,
  scoreText,
  searchTokens,
  stem,
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

describe("searchTokens", () => {
  it("drops stop words", () => {
    expect(searchTokens("state of the thread")).toEqual(["state", "thread"]);
  });

  it("keeps a query made only of stop words", () => {
    expect(searchTokens("how to")).toEqual(["how", "to"]);
  });
});

describe("stems", () => {
  it("reduces inflections to one stem", () => {
    expect(stem("theming")).toBe("them");
    expect(stem("theme")).toBe("them");
    expect(stem("styles")).toBe("styl");
    expect(stem("styling")).toBe("styl");
    expect(stem("api")).toBeUndefined();
  });

  it("matches another form of the word", () => {
    expect(scoreText("Theming", ["theme"])).toBeGreaterThan(0);
    expect(scoreText("Styling guide", ["style"])).toBeGreaterThan(0);
    expect(scoreText("useThemingContext", ["theme"])).toBeGreaterThan(0);
  });

  it("ignores common words a stem spells", () => {
    expect(scoreText("Use them together", ["theme"])).toBe(0);
    expect(scoreText("Tracking", ["tracing"])).toBe(0);
  });

  it("ranks a stem match below a direct match", () => {
    expect(scoreText("Theming", ["theme"])).toBeLessThan(
      scoreText("Thread themes", ["theme"]),
    );
  });
});

describe("searchOtherPages queries", () => {
  const pages: SearchRecord[] = [
    {
      url: "/docs/guides/styling",
      title: "Styling, Themes and Dark Mode",
      description: "Make the chat look like your product.",
      headings: [{ id: "colors", content: "Change colors and fonts" }],
    },
    {
      url: "/docs/runtimes/state",
      title: "Thread State",
      description: "Read the runtime state.",
      headings: [],
    },
    {
      url: "/docs/guides/change-log",
      title: "Change a theme",
      description: "",
      headings: [],
    },
  ];
  const urls = (query: string) =>
    searchOtherPages(pages, query, "/").map((group) => group.pageUrl);

  it("drops stop words", () => {
    expect(urls("state of the thread")).toEqual(["/docs/runtimes/state"]);
  });

  it("finds a page by another form of a word", () => {
    expect(urls("styles")).toEqual(["/docs/guides/styling"]);
  });

  it("matches words spread over a page below single-field matches", () => {
    expect(urls("change the theme")).toEqual([
      "/docs/guides/change-log",
      "/docs/guides/styling",
    ]);
  });

  it("opens a pasted docs link", () => {
    expect(
      urls("https://www.assistant-ui.com/docs/runtimes/state?x=1#top"),
    ).toEqual(["/docs/runtimes/state"]);
  });

  it("shows nothing else for a link to the current page", () => {
    expect(
      searchOtherPages(
        pages,
        "https://www.assistant-ui.com/docs/runtimes/state",
        "/docs/runtimes/state",
      ),
    ).toEqual([]);
  });

  it("treats other sites' links as text", () => {
    expect(urls("https://example.com/docs/runtimes/state")).toEqual([]);
  });

  it("highlights the whole word a stem matched", () => {
    expect(
      highlightMatches("Styling", ["styles"]).filter(
        (segment) => segment.styles?.highlight,
      ),
    ).toEqual([
      { type: "text", content: "Styling", styles: { highlight: true } },
    ]);
  });

  it("searches a moved link by its last segment", () => {
    expect(urls("https://assistant-ui.com/docs/old/styling")).toEqual([
      "/docs/guides/styling",
    ]);
  });
});
