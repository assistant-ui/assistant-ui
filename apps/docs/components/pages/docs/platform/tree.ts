import type * as PageTree from "fumadocs-core/page-tree";
import { PLATFORMS, SURFACES, type Platform } from "@/lib/constants";
import { isVisibleForPlatform } from "@/lib/docs-platform";

export function nodePlatforms(
  node: PageTree.Node,
): readonly string[] | undefined {
  return (node as unknown as { platforms?: readonly string[] }).platforms;
}

export function isNodeVisible(
  node: PageTree.Node,
  platform: Platform,
): boolean {
  return isVisibleForPlatform(nodePlatforms(node), platform);
}

function collectVisibleUrls(
  node: PageTree.Node,
  platform: Platform,
  urls: Set<string>,
): void {
  if (!isNodeVisible(node, platform)) return;

  if (node.type === "page") {
    urls.add(node.url);
    return;
  }

  if (node.type === "separator") return;

  if (node.index && isNodeVisible(node.index, platform)) {
    urls.add(node.index.url);
  }

  node.children.forEach((child) => {
    collectVisibleUrls(child, platform, urls);
  });
}

export function getVisibleUrlsByPlatform(
  tree: PageTree.Root | undefined,
): Record<Platform, ReadonlySet<string>> {
  const folders = (tree?.children ?? []).filter(
    (node): node is PageTree.Folder => node.type === "folder",
  );
  const result = Object.fromEntries(
    PLATFORMS.map((platform) => [platform, new Set<string>()]),
  ) as Record<Platform, Set<string>>;

  PLATFORMS.forEach((platform) => {
    buildPlatformSections(folders, platform).forEach((section) => {
      collectVisibleUrls(section, platform, result[platform]);
    });
  });

  return result;
}

// The platforms a url is restricted to, read from the nearest tagged node on
// its path; undefined for a page every platform shares.
export function getPagePlatforms(
  tree: PageTree.Root | undefined,
  url: string,
): readonly string[] | undefined {
  for (const folder of tree?.children ?? []) {
    if (folder.type !== "folder") continue;
    const path = findPathToNode(folder, url);
    if (!path) continue;
    for (let i = path.length - 1; i >= 0; i--) {
      const platforms = nodePlatforms(path[i]!);
      if (platforms && platforms.length > 0) return platforms;
    }
    return undefined;
  }
  return undefined;
}

export function findPathToNode(
  node: PageTree.Node,
  pathname: string,
): PageTree.Node[] | null {
  if (node.type === "page") return pathname === node.url ? [node] : null;
  if (node.type === "separator") return null;
  if (node.index && pathname === node.index.url) return [node, node.index];

  for (const child of node.children) {
    const childPath = findPathToNode(child, pathname);
    if (childPath) return [node, ...childPath];
  }

  return null;
}

function hasVisibleContent(node: PageTree.Node, platform: Platform): boolean {
  if (!isNodeVisible(node, platform)) return false;
  if (node.type === "page") return true;
  if (node.type === "separator") return false;
  if (node.index && isNodeVisible(node.index, platform)) return true;
  return node.children.some((c) => hasVisibleContent(c, platform));
}

function pruneEmptySeparators(
  items: readonly PageTree.Node[],
  platform: Platform,
): PageTree.Node[] {
  const result: PageTree.Node[] = [];
  items.forEach((item, i) => {
    if (item.type !== "separator") {
      result.push(item);
      return;
    }
    for (const next of items.slice(i + 1)) {
      if (next.type === "separator") break;
      if (hasVisibleContent(next, platform)) {
        result.push(item);
        break;
      }
    }
  });
  return result;
}

function filterChildren(
  folder: PageTree.Folder,
  platform: Platform,
): PageTree.Folder {
  return {
    ...folder,
    children: pruneEmptySeparators(folder.children, platform),
  };
}

// An untagged top-level section belongs to every surface; a library such as
// Tap only receives the sections tagged with its id.
export function buildPlatformSections(
  folders: PageTree.Folder[],
  platform: Platform,
): PageTree.Folder[] {
  return folders
    .filter((f) => (nodePlatforms(f) ?? SURFACES).includes(platform))
    .map((f) => filterChildren(f, platform))
    .filter((f) => hasVisibleContent(f, platform));
}

function firstVisibleUrl(
  nodes: readonly PageTree.Node[],
  platform: Platform,
): string | undefined {
  for (const node of nodes) {
    if (!isNodeVisible(node, platform)) continue;
    if (node.type === "page") return node.url;
    if (node.type === "separator") continue;
    if (node.index && isNodeVisible(node.index, platform))
      return node.index.url;
    const nested = firstVisibleUrl(node.children, platform);
    if (nested) return nested;
  }
  return undefined;
}

export function getPlatformHomeUrl(
  tree: PageTree.Root | undefined,
  platform: Platform,
): string | undefined {
  const folders = (tree?.children ?? []).filter(
    (node): node is PageTree.Folder => node.type === "folder",
  );
  return firstVisibleUrl(buildPlatformSections(folders, platform), platform);
}
