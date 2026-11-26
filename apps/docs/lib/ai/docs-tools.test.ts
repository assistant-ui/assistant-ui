import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const page = (name: string, url: string) => ({ type: "page", name, url });
  const elementPage = {
    url: "/elements/thread",
    data: { title: "Thread", description: "The full chat thread." },
  };
  return {
    elementPage,
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
  design: { getPage: vi.fn() },
}));

vi.mock("@/lib/docs-pages", () => ({ resolveDocsUrl: mocks.resolveDocsUrl }));

import { listDocs, normalizeDocPath, resolveDocPage } from "./docs-tools";

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

  it("lists the Elements catalog", () => {
    expect(listDocs("elements")).toEqual([
      {
        type: "page",
        title: "Thread",
        url: "/elements/thread",
        description: "The full chat thread.",
      },
    ]);
  });
});

describe("resolveDocPage", () => {
  const resolve = (slugOrUrl: string) =>
    resolveDocPage(
      normalizeDocPath(slugOrUrl, "https://www.assistant-ui.com/api/doc/chat")
        .split("/")
        .filter(Boolean),
    );

  it("reads an Elements page by slug or URL", () => {
    expect(resolve("elements/thread")).toBe(mocks.elementPage);
    expect(resolve("/elements/thread")).toBe(mocks.elementPage);
    expect(resolve("https://www.assistant-ui.com/elements/thread#usage")).toBe(
      mocks.elementPage,
    );
  });

  it("reads a docs page with or without the docs prefix", () => {
    expect(resolve("guides/attachments")?.url).toBe("/docs/guides/attachments");
    expect(resolve("/docs/guides/attachments")?.url).toBe(
      "/docs/guides/attachments",
    );
  });
});
