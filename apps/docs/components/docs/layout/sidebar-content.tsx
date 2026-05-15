"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type * as PageTree from "fumadocs-core/page-tree";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useDocsSidebar } from "@/components/docs/contexts/sidebar";
import {
  isPlatform,
  usePlatform,
  type Platform,
} from "@/components/docs/platform/context";
import { GitHubIcon } from "@/components/icons/github";
import { DiscordIcon } from "@/components/icons/discord";
import { analytics } from "@/lib/analytics";
import { PlatformSwitcher } from "@/components/docs/platform/switcher";
import {
  buildPlatformSections,
  findPathToNode,
  isNodeVisible,
  nodePlatforms,
} from "@/components/docs/platform/tree";

function SectionItem({
  item,
  onNavigate,
  platform,
  depth = 0,
}: {
  item: PageTree.Node;
  onNavigate: () => void;
  platform: Platform;
  depth?: number;
}) {
  const pathname = usePathname();

  if (!isNodeVisible(item, platform)) return null;

  if (item.type === "separator") {
    return (
      <p className="mt-4 mb-1 px-2 font-medium text-[10px] text-muted-foreground/60 uppercase tracking-wider first:mt-1">
        {item.name}
      </p>
    );
  }

  if (item.type === "folder") {
    const isActive = item.index && pathname === item.index.url;
    const containsActive = findPathToNode(item, pathname) !== null;
    const hasChildren = item.children.length > 0;

    return (
      <div>
        {item.index ? (
          <Link
            href={item.index.url}
            onClick={() => {
              analytics.docs.navigationClicked(
                String(item.name),
                item.index!.url,
                depth,
              );
              onNavigate();
            }}
            data-active={isActive ? "true" : "false"}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors duration-150",
              isActive
                ? "bg-accent/20 font-medium text-foreground dark:bg-accent/50"
                : "text-muted-foreground hover:bg-accent/30 hover:text-foreground/90 dark:hover:bg-accent/40",
            )}
          >
            {item.icon}
            <span className="truncate">{item.name}</span>
          </Link>
        ) : (
          <p className="mt-3 mb-1 flex items-center gap-2 px-2 font-medium text-[11px] text-muted-foreground/70 uppercase tracking-wider first:mt-1">
            {item.icon}
            {item.name}
          </p>
        )}
        {hasChildren && (containsActive || !item.index) && (
          <div className="ml-2 flex flex-col gap-0.5 border-border/50 border-l pl-2">
            {item.children.map((child) => (
              <SectionItem
                key={child.$id}
                item={child}
                onNavigate={onNavigate}
                platform={platform}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const isActive = pathname === item.url;
  return (
    <Link
      href={item.url}
      onClick={() => {
        analytics.docs.navigationClicked(String(item.name), item.url, depth);
        onNavigate();
      }}
      data-active={isActive ? "true" : "false"}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors duration-150",
        isActive
          ? "bg-accent/20 font-medium text-foreground dark:bg-accent/50"
          : "text-muted-foreground hover:bg-accent/30 hover:text-foreground/90 dark:hover:bg-accent/40",
      )}
    >
      {item.icon}
      <span className="truncate">{item.name}</span>
    </Link>
  );
}

function SidebarSection({
  folder,
  isOpen,
  onToggle,
  onNavigate,
  platform,
}: {
  folder: PageTree.Folder;
  isOpen: boolean;
  onToggle: () => void;
  onNavigate: () => void;
  platform: Platform;
}) {
  const pathname = usePathname();
  const isActive = folder.index && pathname === folder.index.url;

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[13px] transition-colors duration-150 hover:bg-accent/30 dark:hover:bg-accent/40",
          isActive || isOpen
            ? "font-medium text-foreground"
            : "text-muted-foreground/90",
        )}
      >
        <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground">
          {folder.icon}
        </span>
        <span className="flex-1 truncate">{folder.name}</span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground/60 transition-transform duration-200",
            !isOpen && "-rotate-90",
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-0.5 mb-1 ml-3 flex flex-col gap-0.5 border-border/50 border-l pl-2">
              {folder.children.map((child) => (
                <SectionItem
                  key={child.$id}
                  item={child}
                  onNavigate={onNavigate}
                  platform={platform}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SidebarContent({ tree }: { tree?: PageTree.Root }) {
  const { setOpen: setSidebarOpen } = useDocsSidebar();
  const pathname = usePathname();
  const { platform, setPlatform } = usePlatform();
  const navRef = useRef<HTMLElement>(null);

  const platformRef = useRef(platform);
  platformRef.current = platform;

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

  const activeNodePlatforms = useMemo(() => {
    if (!activePath) return undefined;

    for (let i = activePath.length - 1; i >= 0; i--) {
      const platforms = nodePlatforms(activePath[i]!);
      if (platforms !== undefined && platforms.length > 0) return platforms;
    }

    return undefined;
  }, [activePath]);

  useEffect(() => {
    if (!activeNodePlatforms || activeNodePlatforms.length === 0) return;
    if (activeNodePlatforms.includes(platformRef.current)) return;

    const next = activeNodePlatforms.find(isPlatform);
    if (next) setPlatform(next);
  }, [activeNodePlatforms, setPlatform]);

  const activeSectionId = useMemo(() => {
    const activeIds = new Set(activePath?.map((node) => node.$id));
    const match = sections.find((section) => activeIds.has(section.$id));
    return match?.$id ?? sections[0]?.$id ?? null;
  }, [sections, activePath]);

  const [openSectionId, setOpenSectionId] = useState<string | null>(
    activeSectionId,
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is the change trigger
  useEffect(() => {
    if (activeSectionId) setOpenSectionId(activeSectionId);
  }, [activeSectionId, pathname]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: deps are change triggers
  useEffect(() => {
    if (openSectionId !== activeSectionId) return;
    const timer = setTimeout(() => {
      const nav = navRef.current;
      if (!nav) return;
      const active = nav.querySelector<HTMLElement>("[data-active='true']");
      if (!active) return;
      const navRect = nav.getBoundingClientRect();
      const elRect = active.getBoundingClientRect();
      if (elRect.top < navRect.top || elRect.bottom > navRect.bottom) {
        active.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }, 260);
    return () => clearTimeout(timer);
  }, [pathname, openSectionId, activeSectionId]);

  const onNavigate = () => setSidebarOpen(false);

  return (
    <div className="flex h-full flex-col">
      <nav
        ref={navRef}
        className="sidebar-tree-content flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-3 pt-4 pb-4"
      >
        <PlatformSwitcher tree={tree} />
        {sections.map((section) => (
          <SidebarSection
            key={section.$id}
            folder={section}
            isOpen={openSectionId === section.$id}
            onToggle={() => {
              const id = section.$id ?? null;
              const willOpen = openSectionId !== id;
              analytics.docs.folderToggled(String(section.name), willOpen, 0);
              setOpenSectionId(willOpen ? id : null);
            }}
            onNavigate={onNavigate}
            platform={platform}
          />
        ))}
      </nav>
      <div className="flex shrink-0 items-center gap-1 border-border/50 border-t px-3 py-2">
        <a
          href="https://github.com/assistant-ui/assistant-ui"
          target="_blank"
          rel="noopener noreferrer"
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/30 hover:text-foreground dark:hover:bg-accent/40"
          aria-label="GitHub"
        >
          <GitHubIcon className="size-4" />
        </a>
        <a
          href="https://discord.gg/S9dwgCNEFs"
          target="_blank"
          rel="noopener noreferrer"
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/30 hover:text-foreground dark:hover:bg-accent/40"
          aria-label="Discord"
        >
          <DiscordIcon className="size-4" />
        </a>
      </div>
    </div>
  );
}
