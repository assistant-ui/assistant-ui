import type * as PageTree from "fumadocs-core/page-tree";
import type { ReactNode } from "react";
import { Atom } from "lucide-react";

export interface SidebarTab {
  url: string;
  title: string;
  description?: string | undefined;
  icon?: ReactNode;
  urls?: Set<string>;
  children?: SidebarTab[];
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

/** Tabs that should be grouped as children of "Docs" */
const DOCS_CHILDREN = new Set(["React Native", "React Ink", "Cloud"]);

export function getSidebarTabs(tree: PageTree.Root): SidebarTab[] {
  const raw: SidebarTab[] = [];

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

        raw.push(option);
      }
    }

    for (const child of node.children) {
      if (child.type === "folder") scanOptions(child);
    }
  }

  scanOptions(tree);
  if (tree.fallback) scanOptions(tree.fallback);

  // Group Cloud and React Native as children of Docs
  const results: SidebarTab[] = [];
  const childTabs: SidebarTab[] = [];

  for (const tab of raw) {
    if (DOCS_CHILDREN.has(tab.title)) {
      childTabs.push(tab);
    } else {
      results.push(tab);
    }
  }

  if (childTabs.length > 0) {
    const docsTab = results.find((t) => t.title === "Docs");
    if (docsTab) {
      // "React" sub-item keeps the original Docs URLs
      const reactTab: SidebarTab = {
        url: docsTab.url,
        title: "React",
        icon: <Atom />,
        urls: new Set(docsTab.urls),
      };
      // Merge child URLs into the parent so it stays active for all children
      const mergedUrls = new Set(docsTab.urls);
      for (const child of childTabs) {
        if (child.urls) {
          for (const u of child.urls) mergedUrls.add(u);
        }
      }
      docsTab.urls = mergedUrls;
      docsTab.children = [reactTab, ...childTabs];
    }
  }

  return results;
}
