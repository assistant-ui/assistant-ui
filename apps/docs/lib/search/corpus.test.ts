import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const page = (
    url: string,
    title: string,
    description: string,
    headings: string[],
    contents: string[],
  ) => ({
    url,
    data: {
      title,
      description,
      structuredData: () => ({
        headings: headings.map((content) => ({
          id: content.toLowerCase(),
          content,
        })),
        contents: contents.map((content) => ({ content })),
      }),
    },
  });

  return {
    docs: [
      page(
        "/docs/ui/thread",
        "Thread",
        "Render a conversation.",
        ["Usage"],
        ["Render a thread beside your composer."],
      ),
    ],
    tap: [
      page(
        "/tap/docs/overview/introduction",
        "Introduction",
        "Run React hooks as headless resources.",
        [],
        ["A resource runs the hooks you already know."],
      ),
    ],
    design: [
      page(
        "/design/components/sheet",
        "Sheet",
        "A panel that slides in from an edge.",
        [],
        ["The sheet slides in over the page."],
      ),
    ],
    elements: [
      page(
        "/elements/thread",
        "Thread",
        "The thread element.",
        [],
        ["The thread element renders a conversation."],
      ),
    ],
    examples: [
      page(
        "/examples",
        "Examples",
        "Production-ready examples of AI chat in React.",
        [],
        ["Production-ready examples of AI chat in React."],
      ),
      page(
        "/examples/perplexity",
        "Perplexity Clone",
        "Open-source Perplexity-style chat in React.",
        ["Features"],
        ["The Perplexity Clone demonstrates how to customize assistant-ui."],
      ),
    ],
  };
});

// @/lib/source imports the build-generated "fumadocs-mdx:collections/server"
// module, which does not resolve in the test environment, so this mock fully
// replaces the module instead of spreading importOriginal().
vi.mock("@/lib/source", () => ({
  source: { getPages: () => mocks.docs },
  design: { getPages: () => mocks.design },
  elementsDocs: { getPages: () => mocks.elements },
  examples: { getPages: () => mocks.examples },
  getTapDocsPages: () => mocks.tap,
}));

import { buildContentIndex } from "./content-index";
import { buildSearchIndex } from "./pages";

describe("search corpora", () => {
  it("covers the same pages in the browser index and the content index", async () => {
    const browser = await buildSearchIndex();
    const content = await buildContentIndex();

    expect(browser.map((record) => record.url).sort()).toEqual(
      content.map((record) => record.url).sort(),
    );
  });

  it("reaches an example page from both corpora", async () => {
    const browser = await buildSearchIndex();
    const content = await buildContentIndex();

    expect(browser.map((record) => record.url)).toContain(
      "/examples/perplexity",
    );
    expect(content.map((record) => record.url)).toContain(
      "/examples/perplexity",
    );
  });

  it("keeps the browser records metadata-only", async () => {
    const browser = await buildSearchIndex();

    expect(browser[0]).toEqual({
      url: "/docs/ui/thread",
      title: "Thread",
      description: "Render a conversation.",
      headings: [{ id: "usage", content: "Usage" }],
    });
  });
});
