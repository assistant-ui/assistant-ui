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
  PLATFORMS,
  usePlatform,
  type Platform,
} from "@/components/docs/contexts/platform";
import { GitHubIcon } from "@/components/icons/github";
import { DiscordIcon } from "@/components/icons/discord";
import { analytics } from "@/lib/analytics";
import { PlatformSwitcher } from "./platform-switcher";

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

const SHARED_PLATFORM_DOC_URLS = new Set(["/docs/llm", "/docs/architecture"]);

/** Read the optional `platforms` field from a page tree node. */
function nodePlatforms(node: PageTree.Node): readonly string[] | undefined {
  return (node as unknown as { platforms?: readonly string[] }).platforms;
}

function isNodeVisible(node: PageTree.Node, platform: Platform): boolean {
  return isVisibleForPlatform(nodePlatforms(node), platform);
}

function isPlatform(value: string): value is Platform {
  return (PLATFORMS as readonly string[]).includes(value);
}

function withoutPlatformFilter<T extends PageTree.Node>(node: T): T {
  const clone = { ...node } as T & { platforms?: readonly string[] };
  delete clone.platforms;
  return clone;
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

function findPathToNode(
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

/**
 * Renders one item below the section level: a leaf page, a sub-folder, or a
 * separator (rendered as an inline subheader, not a collapsible).
 */
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
          ? "bg-accent/20 font-medium text-foreground dark:bg-accent/50"
          : "text-muted-foreground hover:bg-accent/30 hover:text-foreground/90 dark:hover:bg-accent/40",
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

export function SidebarContent({ tree }: SidebarContentProps) {
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

  const activePath = useMemo(() => {
    for (const folder of allFolders) {
      const path = findPathToNode(folder, pathname);
      if (path) return path;
    }

    return null;
  }, [allFolders, pathname]);

  const activeNodePlatforms = useMemo(() => {
    const platformNode = activePath
      ?.slice()
      .reverse()
      .find((node) => {
        const platforms = nodePlatforms(node);
        return platforms !== undefined && platforms.length > 0;
      });

    return platformNode ? nodePlatforms(platformNode) : undefined;
  }, [activePath]);

  useEffect(() => {
    if (!activeNodePlatforms || activeNodePlatforms.length === 0) return;
    if (activeNodePlatforms.includes(platformRef.current)) return;

    const next = activeNodePlatforms.find(isPlatform);
    if (next) setPlatform(next);
  }, [activeNodePlatforms, setPlatform]);

  // React keeps the full docs tree. React Native and React Ink use only their
  // own platform folder, displayed under the normal "Docs" section label.
  const sections = useMemo<PageTree.Folder[]>(() => {
    if (allFolders.length === 0) return [];

    const injectName = PLATFORM_INJECTED_FOLDER[platform];
    const injectFolder = injectName
      ? allFolders.find((f) => f.name === injectName)
      : undefined;
    const docsFolder = allFolders.find((f) => f.name === INJECT_TARGET_FOLDER);

    if (platform !== "react") {
      if (!injectFolder || !docsFolder) return [];
      const sharedDocs = docsFolder.children
        .filter(
          (child) =>
            child.type === "page" && SHARED_PLATFORM_DOC_URLS.has(child.url),
        )
        .map(withoutPlatformFilter);
      const children = pruneEmptySeparators(injectFolder.children, platform);
      const platformSeparator: PageTree.Separator = {
        type: "separator",
        name: injectFolder.name,
        $id: `platform-${platform}-label`,
      };
      const gettingStartedSeparator: PageTree.Separator = {
        type: "separator",
        name: "Getting Started",
        $id: `platform-${platform}-getting-started`,
      };

      const platformDocsSection = {
        ...docsFolder,
        children: [
          gettingStartedSeparator,
          ...sharedDocs,
          platformSeparator,
          ...children,
        ],
      };
      const sharedSections = allFolders
        .filter(
          (f) =>
            f.name !== INJECT_TARGET_FOLDER &&
            !PLATFORM_FOLDER_NAMES.has(String(f.name)) &&
            isNodeVisible(f, platform),
        )
        .map((f) => ({
          ...f,
          children: pruneEmptySeparators(f.children, platform),
        }));

      return [platformDocsSection, ...sharedSections].filter((f) =>
        hasVisibleContent(f, platform),
      );
    }

    return allFolders
      .filter(
        (f) =>
          !PLATFORM_FOLDER_NAMES.has(String(f.name)) &&
          isNodeVisible(f, platform),
      )
      .map((f) => ({
        ...f,
        children: pruneEmptySeparators(f.children, platform),
      }))
      .filter((f) => hasVisibleContent(f, platform));
  }, [allFolders, platform]);

  const activeSectionId = useMemo(() => {
    const activeIds = new Set(activePath?.map((node) => node.$id));
    const match = sections.find((section) => activeIds.has(section.$id));
    return match?.$id ?? sections[0]?.$id ?? null;
  }, [sections, activePath]);

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
    <div className="flex h-full flex-col">
      <nav
        ref={navRef}
        className="sidebar-tree-content flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-3 pt-4 pb-4"
      >
        <PlatformSwitcher />
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
