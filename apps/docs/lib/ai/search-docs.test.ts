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
  ] satisfies ContentRecord[],
}));

vi.mock("@/lib/search/content-index", () => ({
  buildContentIndex: () => Promise.resolve(mocks.records),
}));

import { createSearchDocsTool } from "./search-docs";

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
