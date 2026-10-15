import { describe, expect, it } from "vitest";
import { getEditUrl, getPageNeighbors } from "./navigation";

const tree: Parameters<typeof getPageNeighbors>[0] = [
  { type: "page", name: "Overview", url: "/guide" },
  { type: "separator", name: "Learn" },
  {
    type: "folder",
    name: "API",
    index: { type: "page", name: "Introduction", url: "/guide/api" },
    children: [
      { type: "page", name: "Client", url: "/guide/api/client" },
      {
        type: "folder",
        name: "Advanced",
        children: [
          { type: "page", name: "Streaming", url: "/guide/api/streaming" },
        ],
      },
    ],
  },
];

describe("documentation navigation", () => {
  it("follows the tree order across folder indexes and sections", () => {
    const { current, previous, next } = getPageNeighbors(tree, "/guide/api");
    expect(current?.name).toBe("Introduction");
    expect(previous?.url).toBe("/guide");
    expect(next).toEqual({
      name: "Client",
      url: "/guide/api/client",
      section: "API",
    });
  });

  it("keeps first and last pages at the boundaries", () => {
    expect(getPageNeighbors(tree, "/guide").previous).toBeUndefined();
    const last = getPageNeighbors(tree, "/guide/api/streaming");
    expect(last.next).toBeUndefined();
    expect(last.current?.section).toBe("Advanced");
    expect(last.previous?.name).toBe("Client");
  });

  it("accepts trailing slashes without changing the navigation target", () => {
    expect(getPageNeighbors(tree, "/guide/api/").current?.url).toBe(
      "/guide/api",
    );
  });

  it("does not invent neighbors for an unknown route or empty tree", () => {
    for (const result of [
      getPageNeighbors(tree, "/missing"),
      getPageNeighbors([], "/guide"),
    ]) {
      expect(result).toEqual({
        current: undefined,
        previous: undefined,
        next: undefined,
      });
    }
  });
});

describe("repository edit links", () => {
  it("uses each consumer's repository, branch, directory, and route", () => {
    expect(
      getEditUrl("/guide/api/", {
        url: "https://github.com/example/project/",
        branch: "docs",
        directory: "/website/",
      }),
    ).toBe(
      "https://github.com/example/project/edit/docs/website/app/guide/api/page.mdx",
    );
  });

  it("supports a repository URL without extra configuration", () => {
    expect(getEditUrl("/docs", "https://github.com/example/project")).toBe(
      "https://github.com/example/project/edit/main/app/docs/page.mdx",
    );
  });

  it.each(["", "/", "////"])(
    "treats directory %j as the repository root",
    (directory) => {
      expect(
        getEditUrl("/docs", {
          url: "https://github.com/example/project",
          directory,
        }),
      ).toBe("https://github.com/example/project/edit/main/app/docs/page.mdx");
    },
  );

  it("trims long boundary slash runs while preserving interior slashes", () => {
    const slashes = "/".repeat(100_000);
    const directory = `website${slashes}content`;
    expect(
      getEditUrl("/docs", {
        url: "https://github.com/example/project",
        directory: `${slashes}${directory}${slashes}`,
      }),
    ).toBe(
      `https://github.com/example/project/edit/main/${directory}/app/docs/page.mdx`,
    );
  });

  it("omits editing when no repository is configured", () => {
    expect(getEditUrl("/docs")).toBeUndefined();
  });
});
