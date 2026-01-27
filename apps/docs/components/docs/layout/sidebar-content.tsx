"use client";

import { useState, type ReactNode } from "react";
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

function findTopLevelFolder(
  nodes: PageTree.Node[],
  pathname: string,
): PageTree.Folder | null {
  for (const node of nodes) {
    if (node.type === "folder") {
      if (node.index && pathname.startsWith(node.index.url)) {
        return node;
      }
      if (containsPath(node, pathname)) {
        return node;
      }
    }
  }
  return null;
}

function containsPath(folder: PageTree.Folder, pathname: string): boolean {
  for (const child of folder.children) {
    if (child.type === "page" && pathname === child.url) {
      return true;
    }
    if (child.type === "folder") {
      if (child.index && pathname === child.index.url) {
        return true;
      }
      if (containsPath(child, pathname)) {
        return true;
      }
    }
  }
  return false;
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
  const [open, setOpen] = useState(true);

  if (item.type === "separator") {
    return (
      <p className="mt-4 mb-1 text-muted-foreground text-sm first:mt-0">
        {item.name}
      </p>
    );
  }

  if (item.type === "folder") {
    const isActive = item.index && pathname === item.index.url;

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

    const handleFolderButtonClick = () => {
      analytics.docs.folderToggled(String(item.name), !open, depth);
      setOpen(!open);
    };

    return (
      <div>
        {item.index ? (
          <Link
            href={item.index.url}
            onClick={handleFolderLinkClick}
            className={cn(
              "flex w-full items-center gap-2 py-2 transition-colors",
              depth > 0 && "pl-4",
              isActive
                ? "font-medium text-foreground"
                : "text-muted-foreground",
            )}
          >
            {item.icon}
            <span className="flex-1">{item.name}</span>
            {item.children.length > 0 && (
              <button
                onClick={handleFolderToggle}
                className="p-1 text-muted-foreground"
              >
                <ChevronDown
                  className={cn(
                    "size-4 transition-transform",
                    !open && "-rotate-90",
                  )}
                />
              </button>
            )}
          </Link>
        ) : (
          <button
            onClick={handleFolderButtonClick}
            className={cn(
              "flex w-full items-center gap-2 py-2 text-muted-foreground transition-colors",
              depth > 0 && "pl-4",
            )}
          >
            {item.icon}
            <span className="flex-1 text-left">{item.name}</span>
            <ChevronDown
              className={cn(
                "size-4 text-muted-foreground transition-transform",
                !open && "-rotate-90",
              )}
            />
          </button>
        )}
        {open && item.children.length > 0 && (
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
        "flex items-center gap-2 py-2 transition-colors",
        depth > 0 && "pl-4",
        isActive ? "font-medium text-foreground" : "text-muted-foreground",
      )}
    >
      {item.icon}
      {item.name}
    </Link>
  );
}

export function SidebarContent({ tree, banner }: SidebarContentProps) {
  const pathname = usePathname();
  const { setOpen } = useDocsSidebar();

  const topLevelFolder = tree
    ? findTopLevelFolder(tree.children, pathname)
    : null;
  const itemsToShow = topLevelFolder ? topLevelFolder.children : tree?.children;

  return (
    <div className="flex h-full flex-col">
      {banner && <div className="shrink-0 px-4 pt-6 pb-4">{banner}</div>}

      {itemsToShow && (
        <nav className="flex-1 overflow-y-auto px-6">
          {itemsToShow.map((item) => (
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
