import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const page = (name: string, url: string) => ({ type: "page", name, url });
  const elementPage = {
    url: "/elements/thread",
    data: { title: "Thread", description: "The full chat thread." },
  };
  const designPage = {
    url: "/design/components/button",
    data: { title: "Button" },
  };
  const elements = [
    { slug: "thread", title: "Thread (catalog)", description: "Catalog text." },
    {
      slug: "conversation-map",
      title: "Conversation map",
      description: "A map of the conversation.",
    },
    { slug: "orb", title: "Orb", description: "A glowing orb." },
    {
      slug: "generative-card",
      title: "Card",
      description: "A generated card.",
      generative: true,
    },
  ];
  return {
    elementPage,
    designPage,
    elements,
    resolveDocsUrl: vi.fn((path: string) =>
      path === "/docs/guides/attachments"
        ? { url: path, data: { title: "File Attachments" } }
        : undefined,
    ),
    tree: {
      name: "Docs",
      children: [
        {
          type: "folder",
          name: "Before You Start",
          children: [
            page("Overview", "/docs"),
            page("Architecture", "/docs/architecture"),
          ],
        },
        {
          type: "folder",
          name: "Getting Started",
          children: [
            page("Installation", "/docs/installation"),
            page("CLI", "/docs/cli"),
          ],
        },
        {
          type: "folder",
          name: "Runtimes",
          children: [
            page("Picking a runtime", "/docs/runtimes/pick-a-runtime"),
            page("Custom backend", "/docs/runtimes/custom/overview"),
            page("LocalRuntime", "/docs/runtimes/custom/local-runtime"),
            {
              type: "folder",
              name: "AI SDK by Vercel",
              children: [
                page("Overview", "/docs/runtimes/ai-sdk/overview"),
                page("AI SDK v7", "/docs/runtimes/ai-sdk/v7"),
              ],
            },
          ],
        },
        {
          type: "folder",
          name: "Assistant Cloud",
          index: page("Introduction", "/docs/cloud"),
          children: [page("Quickstart", "/docs/cloud/quickstart")],
        },
      ],
    },
  };
});

vi.mock("@/lib/source", () => ({
  source: { pageTree: mocks.tree },
  examples: { pageTree: { name: "Examples", children: [] }, getPage: vi.fn() },
  elementsDocs: {
    getPages: () => [mocks.elementPage],
    getPage: (slugs: string[]) =>
      slugs.join("/") === "thread" ? mocks.elementPage : undefined,
  },
  design: {
    getPage: (slugs: string[]) =>
      slugs.join("/") === "components/button" ? mocks.designPage : undefined,
  },
}));

vi.mock("@/lib/docs-pages", () => ({ resolveDocsUrl: mocks.resolveDocsUrl }));

vi.mock("@/lib/get-llm-text", () => ({
  getLLMText: async (page: { url: string }) => `text of ${page.url}`,
}));

vi.mock("@/components/pages/elements/registry", async (importOriginal) => ({
  ...(await importOriginal()),
  ELEMENTS: mocks.elements,
  getElement: (slug: string) =>
    mocks.elements.find((element) => element.slug === slug),
}));

vi.mock(
  "@/components/pages/elements/aui-element-docs",
  async (importOriginal) => ({
    ...(await importOriginal()),
    AUI_ELEMENT_DOCS: {
      "conversation-map": {
        usage: "<ConversationMapAui />",
        props: [
          {
            component: "ConversationMapAui",
            rows: [
              {
                name: "side",
                type: '"left" | "right"',
                defaultValue: '"left"',
                description: "Which gutter the rail sits in.",
              },
              {
                name: "entries",
                type: "ConversationMapEntry[]",
                required: true,
                description: "The turns to show.",
              },
            ],
          },
        ],
      },
    },
  }),
);

vi.mock("@/lib/generative-elements", async (importOriginal) => ({
  ...(await importOriginal()),
  getGenerativeElement: (slug: string) =>
    slug === "generative-card"
      ? { slug, templateSlug: "card", template: { tree: { type: "Card" } } }
      : undefined,
}));

import { listDocs, readDoc } from "./docs-tools";

const urls = (listing: ReturnType<typeof listDocs>) =>
  "error" in listing ? listing : listing.map((entry) => entry.url);

describe("listDocs", () => {
  it("offers the Elements catalog and the examples at the root", () => {
    const names = (listDocs(undefined) as Array<{ name?: unknown }>).map(
      (entry) => entry.name,
    );
    expect(names).toEqual([
      "Before You Start",
      "Getting Started",
      "Runtimes",
      "Assistant Cloud",
      "elements",
      "examples",
    ]);
  });

  it("finds a folder by the URL path its pages share", () => {
    expect(urls(listDocs("runtimes/ai-sdk"))).toEqual([
      "/docs/runtimes/ai-sdk/overview",
      "/docs/runtimes/ai-sdk/v7",
    ]);
    expect(urls(listDocs("cloud"))).toEqual(["/docs/cloud/quickstart"]);
  });

  it("still finds a folder by its display name", () => {
    expect(urls(listDocs("Runtimes/AI SDK by Vercel"))).toEqual([
      "/docs/runtimes/ai-sdk/overview",
      "/docs/runtimes/ai-sdk/v7",
    ]);
    expect(urls(listDocs("getting-started"))).toEqual([
      "/docs/installation",
      "/docs/cli",
    ]);
  });

  it("accepts a path written as a docs URL", () => {
    expect(urls(listDocs("/docs/runtimes/ai-sdk/"))).toEqual([
      "/docs/runtimes/ai-sdk/overview",
      "/docs/runtimes/ai-sdk/v7",
    ]);
  });

  it("does not treat a group folder's first page as a folder", () => {
    expect(listDocs("installation")).toEqual({ error: "Path not found" });
    expect(listDocs("ui")).toEqual({ error: "Path not found" });
  });

  it("lists an inlined folder by its URL path", () => {
    expect(urls(listDocs("runtimes/custom"))).toEqual([
      "/docs/runtimes/custom/overview",
      "/docs/runtimes/custom/local-runtime",
    ]);
  });

  it("lists every catalog element, with the guide's text when there is one", () => {
    expect(listDocs("elements")).toEqual([
      {
        type: "page",
        title: "Thread",
        url: "/elements/thread",
        description: "The full chat thread.",
      },
      {
        type: "page",
        title: "Conversation map",
        url: "/elements/conversation-map",
        description: "A map of the conversation.",
      },
      {
        type: "page",
        title: "Orb",
        url: "/elements/orb",
        description: "A glowing orb.",
      },
      {
        type: "page",
        title: "Card",
        url: "/elements/generative-card",
        description: "A generated card.",
      },
    ]);
  });
});

describe("readDoc", () => {
  const read = (slugOrUrl: string) =>
    readDoc(slugOrUrl, "https://www.assistant-ui.com/api/doc/chat");

  it("reads an Elements guide by slug, path or URL", async () => {
    for (const ref of [
      "elements/thread",
      "/elements/thread",
      "elements/thread?next=/docs",
      "https://www.assistant-ui.com/elements/thread#usage",
    ]) {
      expect(await read(ref)).toEqual({
        title: "Thread",
        url: "/elements/thread",
        content:
          'text of /elements/thread\n\n## Installation\n\n```bash\nnpx shadcn@latest add "@assistant-ui/elements-thread"\n```',
      });
    }
  });

  it("gives a catalog element without a guide its install command, usage and props", async () => {
    const result = await read("elements/conversation-map");
    expect(result).toMatchObject({
      title: "Conversation map",
      url: "/elements/conversation-map",
    });
    const content = "content" in result ? result.content : "";
    expect(content).toContain("A map of the conversation.");
    expect(content).toContain(
      'npx shadcn@latest add "@assistant-ui/elements-conversation-map"',
    );
    expect(content).toContain("<ConversationMapAui />");
    expect(content).toContain(
      '| `side` | `"left" \\| "right"` | `"left"` | Which gutter the rail sits in. |',
    );
    expect(content).toContain(
      "| `entries` (required) | `ConversationMapEntry[]` |  | The turns to show. |",
    );
  });

  it("gives a generative element its render snippet and spec", async () => {
    const result = await read("elements/generative-card");
    const content = "content" in result ? result.content : "";
    expect(content).toContain("renderGenerativeUI(spec, library");
    expect(content).toContain('"type": "Card"');
  });

  it("still gives the install command when nothing else is written", async () => {
    const result = await read("elements/orb");
    const content = "content" in result ? result.content : "";
    expect(content).toContain(
      'npx shadcn@latest add "@assistant-ui/elements-orb"',
    );
    expect(content).not.toContain("## Usage");
  });

  it("reads Design and docs pages, with or without the docs prefix", async () => {
    expect(await read("design/components/button")).toMatchObject({
      url: "/design/components/button",
    });
    for (const ref of [
      "guides/attachments",
      "/docs/guides/attachments",
      "guides/attachments#upload",
    ]) {
      expect(await read(ref)).toMatchObject({
        url: "/docs/guides/attachments",
      });
    }
  });

  it("reports a page that does not exist", async () => {
    expect(await read("elements/nope")).toEqual({
      error: "Page not found: elements/nope",
    });
  });
});
