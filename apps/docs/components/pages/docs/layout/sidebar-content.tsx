"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import type * as PageTree from "fumadocs-core/page-tree";
import {
  DocsSidebarNavigation,
  type DocsNode,
} from "@assistant-ui/docs-theme/ui";
import { useDocsSidebar } from "@/components/pages/docs/contexts/sidebar";
import { usePlatform } from "@/components/pages/docs/platform/context";
import { GitHubIcon } from "@/components/icons/github";
import { DiscordIcon } from "@/components/icons/discord";
import { PlatformSwitcher } from "@/components/pages/docs/platform/switcher";
import {
  buildPlatformSections,
  findActiveSectionId,
  findPathToNode,
  isNodeVisible,
} from "@/components/pages/docs/platform/tree";

export function SidebarContent({
  tree,
  platformSwitcher = true,
}: {
  tree?: PageTree.Root;
  platformSwitcher?: boolean;
}) {
  const { setOpen: setSidebarOpen } = useDocsSidebar();
  const pathname = usePathname();
  const { platform } = usePlatform();

  const allFolders = useMemo(
    () =>
      (tree?.children ?? []).filter(
        (n): n is PageTree.Folder => n.type === "folder",
      ),
    [tree],
  );

  const sections = useMemo(
    () => buildPlatformSections(allFolders, platform),
    [allFolders, platform],
  );

  const activePath = useMemo(() => {
    for (const folder of allFolders) {
      const path = findPathToNode(folder, pathname);
      if (path) return path;
    }
    return null;
  }, [allFolders, pathname]);

  const activeSectionId = useMemo(
    () => findActiveSectionId(sections, activePath),
    [sections, activePath],
  );

  return (
    <DocsSidebarNavigation
      sections={sections}
      pathname={pathname}
      activeSectionId={activeSectionId}
      isVisible={(node: DocsNode) => isNodeVisible(node, platform)}
      onNavigate={() => setSidebarOpen(false)}
      platform={platform}
      banner={
        platformSwitcher && (
          <PlatformSwitcher
            tree={tree}
            className="bg-muted/70 hover:bg-muted data-[popup-open]:bg-muted mx-0 mb-3 h-8 w-full rounded-lg px-2.5 text-[13px] font-medium tracking-tight"
          />
        )
      }
      footer={
        <>
          <a
            href="https://github.com/assistant-ui/assistant-ui"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:bg-accent/30 hover:text-foreground dark:hover:bg-accent/40 flex size-8 items-center justify-center rounded-md transition-colors"
            aria-label="GitHub"
          >
            <GitHubIcon className="size-4" />
          </a>
          <a
            href="https://discord.gg/S9dwgCNEFs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:bg-accent/30 hover:text-foreground dark:hover:bg-accent/40 flex size-8 items-center justify-center rounded-md transition-colors"
            aria-label="Discord"
          >
            <DiscordIcon className="size-4" />
          </a>
        </>
      }
    />
  );
}
