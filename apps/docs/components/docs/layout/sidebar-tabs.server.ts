import type * as PageTree from "fumadocs-core/page-tree";
import type { ReactNode } from "react";

export interface SidebarTab {
  url: string;
  title: string;
  description?: string | undefined;
  icon?: ReactNode;
  urls?: Set<string>;
}

function getFolderUrls(
  folder: PageTree.Folder,
  output: Set<string> = new Set(),
): Set<string> {
  if (folder.index) output.add(folder.index.url);

  for (const child of folder.children) {
    if (child.type === "page" && !child.external) output.add(child.url);
    if (child.type === "folder") getFolderUrls(child, output);
  }

  return output;
}

export function getSidebarTabs(tree: PageTree.Root): SidebarTab[] {
  const results: SidebarTab[] = [];

  function scanOptions(node: PageTree.Root | PageTree.Folder) {
    if ("root" in node && node.root) {
      const urls = getFolderUrls(node);

      if (urls.size > 0) {
        const option: SidebarTab = {
          url: urls.values().next().value ?? "",
          title: typeof node.name === "string" ? node.name : "Untitled",
          icon: node.icon,
          description:
            typeof node.description === "string" ? node.description : undefined,
          urls,
        };

        results.push(option);
      }
    }

    for (const child of node.children) {
      if (child.type === "folder") scanOptions(child);
    }
  }

  scanOptions(tree);
  if (tree.fallback) scanOptions(tree.fallback);

  return results;
}
