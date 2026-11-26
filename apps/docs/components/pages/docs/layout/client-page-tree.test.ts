import { describe, expect, it } from "vitest";
import type * as PageTree from "fumadocs-core/page-tree";
import { PLATFORMS } from "@/lib/constants";
import {
  buildPlatformSections,
  findActiveSectionId,
  findPathToNode,
  getPagePlatforms,
  getPlatformHomeUrl,
  getVisibleUrlsByPlatform,
} from "@/components/pages/docs/platform/tree";
import { toClientPageTree } from "./client-page-tree";

// Shaped like fumadocs output: every node carries a description, a file
// reference and the folder flags, which the browser never reads.
const page = (url: string, platforms?: readonly string[]) =>
  ({
    $id: `content${url}.mdx`,
    $ref: `content${url}.mdx`,
    type: "page",
    name: url.split("/").pop() || "Overview",
    description: `What ${url} covers, in a sentence or two.`,
    url,
    icon: undefined,
    ...(platforms && { platforms }),
  }) as PageTree.Item;

const folder = (
  id: string,
  children: PageTree.Node[],
  options: {
    index?: PageTree.Item;
    platforms?: readonly string[];
    root?: boolean;
  } = {},
) =>
  ({
    $id: id,
    $ref: { folder: id, meta: `${id}/meta.json` },
    type: "folder",
    name: id,
    description: `The ${id} section.`,
    defaultOpen: undefined,
    collapsible: undefined,
    children,
    ...(options.index && { index: options.index }),
    ...(options.platforms && { platforms: options.platforms }),
    ...(options.root && { root: options.root }),
    // fumadocs sets these keys even when they are undefined.
  }) as unknown as PageTree.Folder;

const separator = (name: string): PageTree.Separator => ({
  $id: `sep-${name}`,
  type: "separator",
  name,
});

const tree: PageTree.Root = {
  $id: "root",
  name: "Docs",
  children: [
    folder("start", [page("/docs/architecture")], { index: page("/docs") }),
    folder("react-start", [page("/docs/installation")], {
      platforms: ["react"],
      root: true,
    }),
    folder("rn-start", [page("/docs/react-native/hooks")], {
      index: page("/docs/react-native"),
      platforms: ["rn"],
      root: true,
    }),
    folder("guides", [
      separator("Composer"),
      page("/docs/guides/attachments", ["react"]),
      separator("Terminal"),
      page("/docs/guides/keyboard", ["ink"]),
      folder("nested", [page("/docs/guides/nested/deep")], {
        index: page("/docs/guides/nested"),
      }),
    ]),
    folder(
      "cloud",
      [
        page("/docs/cloud/quickstart"),
        folder("cloud-reference", [page("/docs/cloud/api")], { root: true }),
      ],
      { index: page("/docs/cloud"), platforms: ["cloud"] },
    ),
  ],
};

const allUrls = (nodes: readonly PageTree.Node[]): string[] =>
  nodes.flatMap((node) => {
    if (node.type === "page") return [node.url];
    if (node.type === "separator") return [];
    return [...(node.index ? [node.index.url] : []), ...allUrls(node.children)];
  });

const folders = (root: PageTree.Root) =>
  root.children.filter((n): n is PageTree.Folder => n.type === "folder");

describe("toClientPageTree", () => {
  const client = toClientPageTree(tree);
  const json = JSON.stringify(client);

  it("leaves out what the browser never reads", () => {
    expect(json).not.toContain("description");
    expect(json).not.toContain("$ref");
    expect(json).not.toContain("defaultOpen");
    expect(json).not.toContain("collapsible");
    expect(json).not.toContain(".mdx");
    expect(json.length).toBeLessThan(JSON.stringify(tree).length / 2);
  });

  it("gives every page a short id, unique across the tree", () => {
    const ids: string[] = [];
    const collect = (nodes: readonly PageTree.Node[]) => {
      for (const node of nodes) {
        if (node.type === "page") ids.push(node.$id!);
        if (node.type !== "folder") continue;
        if (node.index) ids.push(node.index.$id!);
        collect(node.children);
      }
    };
    collect(client.children);
    expect(ids).toHaveLength(allUrls(tree.children).length);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.length <= 4)).toBe(true);
  });

  it("answers every sidebar, header and switcher question the same way", () => {
    expect(getVisibleUrlsByPlatform(client)).toEqual(
      getVisibleUrlsByPlatform(tree),
    );
    for (const platform of PLATFORMS) {
      expect(getPlatformHomeUrl(client, platform)).toBe(
        getPlatformHomeUrl(tree, platform),
      );
      const sections = buildPlatformSections(folders(client), platform);
      const fullSections = buildPlatformSections(folders(tree), platform);
      expect(sections.map((s) => [s.$id, s.name])).toEqual(
        fullSections.map((s) => [s.$id, s.name]),
      );
      for (const url of allUrls(tree.children)) {
        const path = sections.map((s) => findPathToNode(s, url)).find(Boolean);
        const fullPath = fullSections
          .map((s) => findPathToNode(s, url))
          .find(Boolean);
        expect(findActiveSectionId(sections, path ?? null)).toBe(
          findActiveSectionId(fullSections, fullPath ?? null),
        );
      }
    }
    for (const url of allUrls(tree.children)) {
      expect(getPagePlatforms(client, url)).toEqual(
        getPagePlatforms(tree, url),
      );
    }
  });
});
