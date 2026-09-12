import { describe, expect, it } from "vitest";
import type * as PageTree from "fumadocs-core/page-tree";
import {
  buildPlatformSections,
  getPagePlatform,
  getPagePlatforms,
  getPlatformHomeUrl,
  getVisibleUrlsByPlatform,
} from "./tree";

type Platforms = { platforms?: readonly string[] };

const page = (url: string, platforms?: readonly string[]): PageTree.Item =>
  ({
    type: "page",
    name: url,
    url,
    ...(platforms && { platforms }),
  }) as PageTree.Item & Platforms;

const separator = (name: string): PageTree.Separator => ({
  type: "separator",
  name,
  $id: `sep-${name}`,
});

const folder = (
  name: string,
  children: PageTree.Node[],
  options: { index?: PageTree.Item; platforms?: readonly string[] } = {},
): PageTree.Folder =>
  ({
    type: "folder",
    name,
    $id: name,
    children,
    ...(options.index && { index: options.index }),
    ...(options.platforms && { platforms: options.platforms }),
  }) as PageTree.Folder & Platforms;

const tree: PageTree.Root = {
  $id: "root",
  name: "docs",
  children: [
    folder(
      "Before you start",
      [page("/docs/architecture"), page("/docs/llm")],
      {
        index: page("/docs"),
      },
    ),
    folder("Getting Started", [page("/docs/installation"), page("/docs/cli")], {
      platforms: ["react"],
    }),
    folder(
      "Getting Started",
      [
        page("/docs/react-native/migration"),
        separator("API Reference"),
        page("/docs/react-native/hooks"),
      ],
      { index: page("/docs/react-native"), platforms: ["rn"] },
    ),
    folder(
      "Guides",
      [
        separator("Composer"),
        page("/docs/guides/attachments", ["react"]),
        separator("Terminal"),
        page("/docs/guides/keyboard", ["ink"]),
      ],
      { platforms: ["react", "ink"] },
    ),
    folder("Tap", [page("/docs/tap/quickstart")], {
      index: page("/docs/tap"),
      platforms: ["tap"],
    }),
  ],
};

const names = (sections: PageTree.Folder[]) => sections.map((s) => s.name);
const childNames = (section: PageTree.Folder) =>
  section.children.map((c) =>
    c.type === "separator" ? `--${c.name}` : c.name,
  );

describe("buildPlatformSections", () => {
  it("keeps the universal section first and picks the platform's own Getting Started", () => {
    const folders = tree.children as PageTree.Folder[];

    expect(names(buildPlatformSections(folders, "react"))).toEqual([
      "Before you start",
      "Getting Started",
      "Guides",
    ]);
    expect(childNames(buildPlatformSections(folders, "react")[1]!)).toEqual([
      "/docs/installation",
      "/docs/cli",
    ]);

    const rn = buildPlatformSections(folders, "rn");
    expect(names(rn)).toEqual(["Before you start", "Getting Started"]);
    expect(rn[1]!.index?.url).toBe("/docs/react-native");
    expect(childNames(rn[1]!)).toEqual([
      "/docs/react-native/migration",
      "--API Reference",
      "/docs/react-native/hooks",
    ]);
  });

  it("drops separators whose group has nothing visible on the platform", () => {
    const folders = tree.children as PageTree.Folder[];
    const guides = buildPlatformSections(folders, "ink").find(
      (s) => s.name === "Guides",
    );
    expect(guides && childNames(guides)).toEqual([
      "/docs/guides/attachments",
      "--Terminal",
      "/docs/guides/keyboard",
    ]);
  });
});

describe("libraries", () => {
  it("only receive sections tagged with their id and start on their own index", () => {
    const folders = tree.children as PageTree.Folder[];
    expect(names(buildPlatformSections(folders, "tap"))).toEqual(["Tap"]);
    expect(names(buildPlatformSections(folders, "react"))).not.toContain("Tap");
    expect(getPlatformHomeUrl(tree, "tap")).toBe("/docs/tap");
    expect(getPlatformHomeUrl(tree, "react")).toBe("/docs");
    expect(getPlatformHomeUrl(tree, "ink")).toBe("/docs");
  });
});

describe("getPagePlatforms", () => {
  it("reads the nearest tag on the page's path and leaves shared pages open", () => {
    expect(getPagePlatforms(tree, "/docs/react-native")).toEqual(["rn"]);
    expect(getPagePlatforms(tree, "/docs/react-native/hooks")).toEqual(["rn"]);
    expect(getPagePlatforms(tree, "/docs/guides/keyboard")).toEqual(["ink"]);
    expect(getPagePlatforms(tree, "/docs/tap/quickstart")).toEqual(["tap"]);
    expect(getPagePlatforms(tree, "/docs")).toBeUndefined();
    expect(getPagePlatforms(tree, "/docs/architecture")).toBeUndefined();
    expect(getPagePlatforms(tree, "/nowhere")).toBeUndefined();
  });

  it("resolves a single owning platform for titles and defaults otherwise", () => {
    expect(getPagePlatform(tree, "/docs/react-native/hooks")).toBe("rn");
    expect(getPagePlatform(tree, "/docs/guides/keyboard")).toBe("ink");
    expect(getPagePlatform(tree, "/docs/tap")).toBe("tap");
    expect(getPagePlatform(tree, "/docs/architecture")).toBe("react");
    expect(getPagePlatform(tree, "/docs/guides")).toBe("react");
  });
});

describe("getVisibleUrlsByPlatform", () => {
  it("lists the shared pages for every platform and platform pages only for their own", () => {
    const urls = getVisibleUrlsByPlatform(tree);

    for (const platform of ["react", "rn", "ink"] as const) {
      expect(urls[platform].has("/docs")).toBe(true);
      expect(urls[platform].has("/docs/architecture")).toBe(true);
    }
    expect(urls.react.has("/docs/installation")).toBe(true);
    expect(urls.rn.has("/docs/installation")).toBe(false);
    expect(urls.rn.has("/docs/react-native")).toBe(true);
    expect(urls.ink.has("/docs/react-native")).toBe(false);
    expect(urls.ink.has("/docs/guides/keyboard")).toBe(true);
    expect(urls.react.has("/docs/guides/keyboard")).toBe(false);
    expect(urls.tap.has("/docs")).toBe(false);
    expect(urls.tap.has("/docs/tap/quickstart")).toBe(true);
  });
});
