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
  isVisibleForPlatform,
  usePlatform,
  type Platform,
} from "@/components/docs/contexts/platform";
import { analytics } from "@/lib/analytics";

/**
 * Top-level docs folder names (from each folder's meta.json `title`) that this
 * sidebar treats specially. Kept here as named constants so the platform
 * filter / merge isn't silently broken if a meta title is renamed.
 */
const INJECT_TARGET_FOLDER = "Docs";
const PLATFORM_INJECTED_FOLDER: Record<Platform, string | null> = {
  react: null,
  rn: "React Native",
  ink: "React Ink",
};
const PLATFORM_FOLDER_NAMES = new Set(
  Object.values(PLATFORM_INJECTED_FOLDER).filter(
    (v): v is string => v !== null,
  ),
);

/** Read the optional `platforms` field from a page tree node. */
function nodePlatforms(node: PageTree.Node): readonly string[] | undefined {
  return (node as unknown as { platforms?: readonly string[] }).platforms;
}

function isNodeVisible(node: PageTree.Node, platform: Platform): boolean {
  return isVisibleForPlatform(nodePlatforms(node), platform);
}

/**
 * True when this node would render at least one page or folder under the
 * given platform — i.e., the section / folder is not empty after filtering.
 */
function hasVisibleContent(node: PageTree.Node, platform: Platform): boolean {
  if (!isNodeVisible(node, platform)) return false;
  if (node.type === "page") return true;
  if (node.type === "separator") return false;
  if (node.index && isNodeVisible(node.index, platform)) return true;
  return node.children.some((c) => hasVisibleContent(c, platform));
}

/**
 * Drop separators that have no visible content between them and the next
 * separator (or end of list). Pages / folders that are themselves invisible
 * are preserved here — SectionItem handles per-node visibility — but we use
 * isNodeVisible/hasVisibleContent to decide whether the *segment* under each
 * separator has anything worth rendering.
 */
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
    let hasVisible = false;
    for (const next of items.slice(i + 1)) {
      if (next.type === "separator") break;
      if (hasVisibleContent(next, platform)) {
        hasVisible = true;
        break;
      }
    }
    if (hasVisible) result.push(item);
  });
  return result;
}

interface SidebarContentProps {
  tree?: PageTree.Root;
}

function containsPath(node: PageTree.Node, pathname: string): boolean {
  if (node.type === "page") return pathname === node.url;
  if (node.type === "separator") return false;
  if (node.index && pathname === node.index.url) return true;
  return node.children.some((child) => containsPath(child, pathname));
}

/**
 * Renders one item below the section level: a leaf page, a sub-folder, or a
 * separator (rendered as an inline subheader, not a collapsible).
 */
function SectionItem({
  item,
  onNavigate,
  depth = 0,
}: {
  item: PageTree.Node;
  onNavigate: () => void;
  depth?: number;
}) {
  const pathname = usePathname();
  const { platform } = usePlatform();

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
    const containsActive = containsPath(item, pathname);
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
                ? "bg-accent/40 font-medium text-foreground"
                : "text-muted-foreground hover:bg-accent/40 hover:text-foreground/90",
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
          <div className="ml-2 border-border/50 border-l pl-2">
            {item.children.map((child) => (
              <SectionItem
                key={child.$id}
                item={child}
                onNavigate={onNavigate}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // page
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
          ? "bg-accent/40 font-medium text-foreground"
          : "text-muted-foreground hover:bg-accent/40 hover:text-foreground/90",
      )}
    >
      {item.icon}
      <span className="truncate">{item.name}</span>
    </Link>
  );
}

/**
 * One top-level chevron section (e.g. "Docs", "Primitives", "Components").
 * Click the header to expand/collapse. Active section auto-expands.
 */
function SidebarSection({
  folder,
  isOpen,
  onToggle,
  onNavigate,
}: {
  folder: PageTree.Folder;
  isOpen: boolean;
  onToggle: () => void;
  onNavigate: () => void;
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
          "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[13px] transition-colors duration-150 hover:bg-accent/40",
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
            <div className="mt-0.5 mb-1 ml-3 border-border/50 border-l pl-2">
              {folder.children.map((child) => (
                <SectionItem
                  key={child.$id}
                  item={child}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SidebarContent({ tree }: SidebarContentProps) {
  const { setOpen: setSidebarOpen } = useDocsSidebar();
  const pathname = usePathname();
  const { platform, setPlatform } = usePlatform();
  const navRef = useRef<HTMLElement>(null);

  // Read latest platform via ref so the auto-switch effect below depends only
  // on pathname — without this, the effect re-fires whenever the user clicks
  // the platform switcher, immediately reverting their selection on
  // platform-specific pages (e.g. /docs/react-native/...).
  const platformRef = useRef(platform);
  platformRef.current = platform;

  // If the user lands on a page (e.g. from a search result) whose containing
  // section is hidden under the current platform, switch to a platform that
  // makes it visible. Sections with no `platforms` field are universal and
  // never trigger this. Only fires on pathname change, not platform change.
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is the only intended trigger
  useEffect(() => {
    const allFolders = (tree?.children ?? []).filter(
      (n): n is PageTree.Folder => n.type === "folder",
    );
    const active = allFolders.find((s) => containsPath(s, pathname));
    const platforms = active ? nodePlatforms(active) : undefined;
    if (!platforms || platforms.length === 0) return;
    if (platforms.includes(platformRef.current)) return;
    setPlatform(platforms[0] as Platform);
  }, [pathname]);

  // Top-level folders become the chevron sections. The standalone
  // platform-specific top-levels ("React Native", "React Ink") never render
  // as their own sections; instead, when their platform is active, their
  // children are merged into the main "Docs" section so the sidebar
  // structure stays unified across platforms. Per-page `platforms` filtering
  // is handled by SectionItem.
  const sections = useMemo<PageTree.Folder[]>(() => {
    if (!tree?.children) return [];
    const allFolders = tree.children.filter(
      (n): n is PageTree.Folder => n.type === "folder",
    );

    const injectName = PLATFORM_INJECTED_FOLDER[platform];
    const injectFolder = injectName
      ? allFolders.find((f) => f.name === injectName)
      : undefined;

    return allFolders
      .filter(
        (f) =>
          !PLATFORM_FOLDER_NAMES.has(String(f.name)) &&
          isNodeVisible(f, platform),
      )
      .map((f) => {
        if (!injectFolder || f.name !== INJECT_TARGET_FOLDER) return f;
        const separator: PageTree.Separator = {
          type: "separator",
          name: injectFolder.name,
          $id: `platform-injected-${injectFolder.$id ?? "sep"}`,
        };
        return {
          ...f,
          children: [...f.children, separator, ...injectFolder.children],
        };
      })
      .map((f) => ({
        ...f,
        children: pruneEmptySeparators(f.children, platform),
      }))
      .filter((f) => hasVisibleContent(f, platform));
  }, [tree, platform]);

  const activeSectionId = useMemo(() => {
    const match = sections.find((s) => containsPath(s, pathname));
    return match?.$id ?? sections[0]?.$id ?? null;
  }, [sections, pathname]);

  const [openSectionId, setOpenSectionId] = useState<string | null>(
    activeSectionId,
  );

  // When the route changes, ensure the section containing the active page is
  // open — even if the user previously collapsed it manually. Depending on
  // pathname (not just activeSectionId) re-fires the effect on every route
  // change, including intra-section nav where activeSectionId is unchanged.
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is the change trigger
  useEffect(() => {
    if (activeSectionId) setOpenSectionId(activeSectionId);
  }, [activeSectionId, pathname]);

  // After expand animation, scroll the active link into view if off-screen.
  // Skip when the active link's section is collapsed — the link is hidden
  // inside an overflow-hidden region, scrolling to it would be incorrect.
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
    <nav
      ref={navRef}
      className="sidebar-tree-content flex h-full flex-col gap-0.5 overflow-y-auto px-3 pt-4 pb-12"
    >
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
        />
      ))}
    </nav>
  );
}
