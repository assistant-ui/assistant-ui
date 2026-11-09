import { describe, expect, it, vi } from "vitest";
import { loader } from "fumadocs-core/source";
import { createContentSource } from "./content-source";

it("loads neither search text nor bodies for navigation, and loads them independently on demand", async () => {
  const Body = () => <p>Install the package.</p>;
  const load = vi.fn(async () => ({
    default: Body,
    toc: [{ title: "Install", url: "#install", depth: 2 }],
  }));
  const loadData = vi.fn(async () => ({
    "(start)/index.mdx": {
      structured: {
        headings: [{ id: "install", content: "Install" }],
        contents: [{ content: "Install the package." }],
      },
    },
  }));
  const source = loader({
    baseUrl: "/docs",
    source: createContentSource(
      "docs",
      [
        {
          path: "(start)/index.mdx",
          metadata: { title: "Welcome", platforms: ["react"] },
        },
        {
          path: "(start)/setup.mdx",
          metadata: { title: "Setup" },
        },
      ],
      [
        { path: "meta.json", data: { pages: ["(start)"] } },
        {
          path: "(start)/meta.json",
          data: { title: "Start", pages: ["setup", "index"] },
        },
      ],
      { "(start)/index.mdx": load, "(start)/setup.mdx": load },
      loadData,
    ),
  });
  expect(source.generateParams()).toEqual([{ slug: [] }, { slug: ["setup"] }]);
  expect(source.pageTree.children).toMatchObject([
    {
      type: "folder",
      name: "Start",
      children: [{ name: "Setup" }, { name: "Welcome" }],
    },
  ]);
  const page = source.getPage([])!;
  expect(page.data.platforms).toEqual(["react"]);
  expect(loadData).not.toHaveBeenCalled();
  expect(load).not.toHaveBeenCalled();
  expect(await page.data.structuredData()).toEqual({
    headings: [{ id: "install", content: "Install" }],
    contents: [{ heading: undefined, content: "Install the package." }],
  });
  expect(loadData).toHaveBeenCalledOnce();
  expect(load).not.toHaveBeenCalled();
  expect(await page.data.load()).toEqual({
    body: Body,
    toc: [{ title: "Install", url: "#install", depth: 2 }],
  });
  expect(load).toHaveBeenCalledTimes(1);
  expect(loadData).toHaveBeenCalledOnce();
});

describe("content frontmatter", () => {
  it("retains blog dates and rejects unsupported platforms", () => {
    const source = createContentSource(
      "blog",
      [
        {
          path: "post.mdx",
          metadata: { title: "Post", author: "Maintainer", date: "2026-10-31" },
        },
      ],
      [],
      {},
      async () => ({}),
    );
    expect(source.files[0]?.data).toMatchObject({
      date: new Date("2026-10-31"),
      author: "Maintainer",
    });
    expect(() =>
      createContentSource(
        "docs",
        [
          {
            path: "index.mdx",
            metadata: { title: "Docs", platforms: ["unknown"] },
          },
        ],
        [],
        {},
        async () => ({}),
      ),
    ).toThrow();
  });
});
