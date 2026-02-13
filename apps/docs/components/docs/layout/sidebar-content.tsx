"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type * as PageTree from "fumadocs-core/page-tree";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDocsSidebar } from "@/components/docs/contexts/sidebar";
import { analytics } from "@/lib/analytics";

interface SidebarContentProps {
  tree?: PageTree.Root;
  banner?: ReactNode;
}

function containsPath(node: PageTree.Node, pathname: string): boolean {
  if (node.type === "page") return pathname === node.url;
  if (node.type === "separator") return false;

  if (node.index && pathname === node.index.url) return true;
  return node.children.some((child) => containsPath(child, pathname));
}

function PageTreeItem({
  item,
  onNavigate,
  depth = 0,
}: {
  item: PageTree.Node;
  onNavigate: () => void;
  depth?: number;
}) {
  const pathname = usePathname();
  const isTopLevel = depth === 0;
  const [open, setOpen] = useState(() => {
    if (item.type !== "folder") return true;
    if (!isTopLevel) return true;
    return containsPath(item, pathname);
  });

  useEffect(() => {
    if (item.type !== "folder" || !isTopLevel) return;
    setOpen(containsPath(item, pathname));
  }, [isTopLevel, item, pathname]);

  if (item.type === "separator") {
    return (
      <p className="mt-5 mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60 first:mt-0">
        {item.name}
      </p>
    );
  }

  if (item.type === "folder") {
    const isActive = item.index && pathname === item.index.url;
    const hasChildren = item.children.length > 0;

    const handleFolderLinkClick = () => {
      if (item.index) {
        analytics.docs.navigationClicked(
          String(item.name),
          item.index.url,
          depth,
        );
      }
      onNavigate();
    };

    const handleFolderToggle = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      analytics.docs.folderToggled(String(item.name), !open, depth);
      setOpen(!open);
    };

    const handleFolderNameClick = () => {
      if (item.index) {
        handleFolderLinkClick();
        return;
      }

      analytics.docs.folderToggled(String(item.name), !open, depth);
      setOpen(!open);
    };

    return (
      <div className={cn(isTopLevel && "mb-0.5")}>
        <div
          className={cn(
            "group flex w-full items-center gap-2 py-1.5 transition-colors duration-150",
            depth > 0 && "pl-4",
            isTopLevel &&
              "rounded-md px-2 hover:bg-accent/60 data-[active=true]:bg-accent/40",
          )}
          data-active={isActive ? "true" : "false"}
        >
          {item.icon}
          {item.index ? (
            <Link
              href={item.index.url}
              onClick={handleFolderLinkClick}
              className={cn(
                "min-w-0 flex-1 truncate text-[13px]",
                isActive
                  ? "font-medium text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {item.name}
            </Link>
          ) : (
            <button
              onClick={handleFolderNameClick}
              className="min-w-0 flex-1 text-left text-[13px] text-muted-foreground"
            >
              {item.name}
            </button>
          )}
          {hasChildren && (
            <button
              onClick={handleFolderToggle}
              className="p-1 text-muted-foreground/60 transition-colors hover:text-muted-foreground"
              aria-label={open ? "Collapse section" : "Expand section"}
            >
              <ChevronDown
                className={cn(
                  "size-3.5 transition-transform duration-200",
                  !open && "-rotate-90",
                )}
              />
            </button>
          )}
        </div>
        {typeof item.description === "string" && isTopLevel && (
          <p className="px-2 pb-1 text-[11px] text-muted-foreground/60">
            {item.description}
          </p>
        )}
        {open && hasChildren && (
          <div className="pl-4">
            {item.children.map((child) => (
              <PageTreeItem
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

  const isActive = pathname === item.url;

  const handlePageClick = () => {
    analytics.docs.navigationClicked(String(item.name), item.url, depth);
    onNavigate();
  };

  return (
    <Link
      href={item.url}
      onClick={handlePageClick}
      className={cn(
        "flex items-center gap-2 py-1.5 text-[13px] transition-colors duration-150",
        depth > 0 && "pl-4",
        isActive
          ? "font-medium text-foreground"
          : "text-muted-foreground hover:text-foreground/80",
      )}
    >
      {item.icon}
      {item.name}
    </Link>
  );
}

/**
 * When section tabs are shown (banner is present), find the active section
 * folder and return only its children — avoids duplicating section-level
 * items that the tabs already display.
 */
function getActiveSectionChildren(
  tree: PageTree.Root,
  pathname: string,
): PageTree.Node[] {
  for (const item of tree.children) {
    if (item.type === "folder" && containsPath(item, pathname)) {
      return item.children;
    }
  }
  // Fallback: return all children (shouldn't normally happen)
  return tree.children;
}

export function SidebarContent({ tree, banner }: SidebarContentProps) {
  const { setOpen } = useDocsSidebar();
  const pathname = usePathname();

  // When banner (section tabs) is present, only show children of the active
  // section — the tabs already handle section-level navigation.
  const treeItems = useMemo(() => {
    if (!tree?.children) return null;
    if (banner) return getActiveSectionChildren(tree, pathname);
    return tree.children;
  }, [tree, banner, pathname]);

  return (
    <div className="flex h-full flex-col">
      {banner && <div className="shrink-0 px-4 pt-5 pb-5">{banner}</div>}

      {treeItems && (
        <nav className="sidebar-tree-content flex-1 overflow-y-auto px-5 pb-12">
          {treeItems.map((item) => (
            <PageTreeItem
              key={item.$id}
              item={item}
              onNavigate={() => setOpen(false)}
            />
          ))}
        </nav>
      )}
    </div>
  );
}
