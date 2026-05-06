import type { ReactNode } from "react";
import type * as PageTree from "fumadocs-core/page-tree";
import { isVisibleForPlatform, PLATFORMS, type Platform } from "./context";

export interface PlatformTreeConfig {
  mainDocsFolder: string;
  platformFolders: Partial<Record<Platform, string>>;
  sharedPageUrls: ReadonlySet<string>;
}

export const PLATFORM_TREE_CONFIG: PlatformTreeConfig = {
  mainDocsFolder: "Docs",
  platformFolders: { rn: "React Native", ink: "React Ink" },
  sharedPageUrls: new Set(["/docs/llm", "/docs/architecture"]),
};

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
  const result: Record<Platform, Set<string>> = {
    react: new Set(),
    rn: new Set(),
    ink: new Set(),
  };

  PLATFORMS.forEach((platform) => {
    buildPlatformSections(folders, platform).forEach((section) => {
      collectVisibleUrls(section, platform, result[platform]);
    });
  });

  return result;
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

function withoutPlatformFilter<T extends PageTree.Node>(node: T): T {
  const clone = { ...node } as T & { platforms?: readonly string[] };
  delete clone.platforms;
  return clone;
}

function hasVisibleContent(node: PageTree.Node, platform: Platform): boolean {
  if (!isNodeVisible(node, platform)) return false;
  if (node.type === "page") return true;
  if (node.type === "separator") return false;
  if (node.index && isNodeVisible(node.index, platform)) return true;
  return node.children.some((c) => hasVisibleContent(c, platform));
}

export function pruneEmptySeparators(
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

function separator(name: ReactNode, id: string): PageTree.Separator {
  return { type: "separator", name, $id: id };
}

function mergePlatformDocs(
  docsFolder: PageTree.Folder,
  platformFolder: PageTree.Folder,
  platform: Platform,
  sharedPageUrls: ReadonlySet<string>,
): PageTree.Folder {
  const sharedPages = docsFolder.children
    .filter((c) => c.type === "page" && sharedPageUrls.has(c.url))
    .map(withoutPlatformFilter);

  return {
    ...docsFolder,
    children: [
      separator("Getting Started", `platform-${platform}-getting-started`),
      ...sharedPages,
      separator(platformFolder.name, `platform-${platform}-label`),
      ...pruneEmptySeparators(platformFolder.children, platform),
    ],
  };
}

export function buildPlatformSections(
  folders: PageTree.Folder[],
  platform: Platform,
  config: PlatformTreeConfig = PLATFORM_TREE_CONFIG,
): PageTree.Folder[] {
  if (folders.length === 0) return [];

  const allPlatformFolderNames = new Set(
    Object.values(config.platformFolders).filter(
      (v): v is string => v !== null,
    ),
  );

  const platformFolderName = config.platformFolders[platform];

  if (platformFolderName) {
    const platformFolder = folders.find((f) => f.name === platformFolderName);
    const docsFolder = folders.find((f) => f.name === config.mainDocsFolder);
    if (!platformFolder || !docsFolder) {
      const missingFolder = !docsFolder
        ? config.mainDocsFolder
        : platformFolderName;
      if (process.env.NODE_ENV !== "production") {
        throw new Error(`[platform-tree] Missing folder: ${missingFolder}`);
      }

      return folders
        .filter(
          (f) =>
            !allPlatformFolderNames.has(String(f.name)) &&
            isNodeVisible(f, platform),
        )
        .map((f) => filterChildren(f, platform))
        .filter((f) => hasVisibleContent(f, platform));
    }

    const merged = mergePlatformDocs(
      docsFolder,
      platformFolder,
      platform,
      config.sharedPageUrls,
    );

    const shared = folders
      .filter(
        (f) =>
          f.name !== config.mainDocsFolder &&
          !allPlatformFolderNames.has(String(f.name)) &&
          isNodeVisible(f, platform),
      )
      .map((f) => filterChildren(f, platform));

    return [merged, ...shared].filter((f) => hasVisibleContent(f, platform));
  }

  return folders
    .filter(
      (f) =>
        !allPlatformFolderNames.has(String(f.name)) &&
        isNodeVisible(f, platform),
    )
    .map((f) => filterChildren(f, platform))
    .filter((f) => hasVisibleContent(f, platform));
}
