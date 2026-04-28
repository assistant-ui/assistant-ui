"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type * as PageTree from "fumadocs-core/page-tree";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useDocsSidebar } from "@/components/docs/contexts/sidebar";
import { analytics } from "@/lib/analytics";

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
  const navRef = useRef<HTMLElement>(null);

  // Top-level folders become the chevron sections.
  const sections = useMemo<PageTree.Folder[]>(() => {
    if (!tree?.children) return [];
    return tree.children.filter(
      (n): n is PageTree.Folder => n.type === "folder",
    );
  }, [tree]);

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
