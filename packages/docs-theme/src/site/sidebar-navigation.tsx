"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import type { DocsNode, DocsFolder } from "./tree";
import { findActivePath } from "./tree";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, domAnimation, LazyMotion } from "motion/react";
import * as m from "motion/react-m";
import { cn } from "./utils";

function SectionItem({
  item,
  onNavigate,
  pathname,
  activePath,
  isVisible,
}: {
  item: DocsNode;
  onNavigate: () => void;
  pathname: string;
  activePath: ReadonlySet<DocsNode>;
  isVisible: (node: DocsNode) => boolean;
}) {
  if (!isVisible(item)) return null;

  if (item.type === "separator") {
    return (
      <p className="text-muted-foreground mt-4 mb-1 px-2 text-xs font-medium first:mt-1">
        {item.name}
      </p>
    );
  }

  if (item.type === "folder") {
    const isActive = item.index && pathname === item.index.url;
    const containsActive = activePath.has(item);
    const hasChildren = item.children.length > 0;

    return (
      <div>
        {item.index ? (
          <Link
            href={item.index.url}
            onClick={onNavigate}
            data-active={isActive ? "true" : "false"}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors duration-150",
              isActive
                ? "bg-accent/20 text-foreground dark:bg-accent/50 font-medium"
                : "text-muted-foreground hover:bg-accent/30 hover:text-foreground/90 dark:hover:bg-accent/40",
            )}
          >
            {item.icon}
            <span className="truncate">{item.name}</span>
          </Link>
        ) : (
          <p className="text-muted-foreground mt-3 mb-1 flex items-center gap-2 px-2 text-xs font-medium first:mt-1">
            {item.icon}
            {item.name}
          </p>
        )}
        {hasChildren && (containsActive || !item.index) && (
          <div className="border-border/50 ml-2 flex flex-col gap-0.5 border-l pl-2">
            {item.children.map((child) => (
              <SectionItem
                key={child.$id}
                item={child}
                onNavigate={onNavigate}
                pathname={pathname}
                activePath={activePath}
                isVisible={isVisible}
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
      onClick={onNavigate}
      data-active={isActive ? "true" : "false"}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors duration-150",
        isActive
          ? "bg-accent/20 text-foreground dark:bg-accent/50 font-medium"
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
  pathname,
  activePath,
  isVisible,
}: {
  folder: DocsFolder;
  isOpen: boolean;
  onToggle: () => void;
  onNavigate: () => void;
  pathname: string;
  activePath: ReadonlySet<DocsNode>;
  isVisible: (node: DocsNode) => boolean;
}) {
  const isActive = folder.index && pathname === folder.index.url;

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className={cn(
          "hover:bg-accent/30 dark:hover:bg-accent/40 flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[13px] transition-colors duration-150",
          isActive || isOpen
            ? "text-foreground font-medium"
            : "text-muted-foreground/90",
        )}
      >
        <span className="text-muted-foreground flex size-4 shrink-0 items-center justify-center">
          {folder.icon}
        </span>
        <span className="flex-1 truncate">{folder.name}</span>
        <ChevronDown
          className={cn(
            "text-muted-foreground/60 size-3.5 shrink-0 transition-transform duration-200",
            !isOpen && "-rotate-90",
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="border-border/50 mt-0.5 mb-1 ml-4 flex flex-col gap-0.5 border-l pl-2">
              {folder.children.map((child) => (
                <SectionItem
                  key={child.$id}
                  item={child}
                  onNavigate={onNavigate}
                  pathname={pathname}
                  activePath={activePath}
                  isVisible={isVisible}
                />
              ))}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const visible = () => true;

export function DocsSidebarNavigation({
  sections,
  pathname,
  activeSectionId,
  isVisible = visible,
  onNavigate,
  banner,
  footer,
  platform,
}: {
  sections: readonly DocsFolder[];
  pathname: string;
  activeSectionId: string | null;
  isVisible?: (node: DocsNode) => boolean;
  onNavigate: () => void;
  banner?: ReactNode;
  footer?: ReactNode;
  platform?: string;
}) {
  const navRef = useRef<HTMLElement>(null);
  const activePath = useMemo(
    () => new Set(findActivePath(sections, pathname)),
    [sections, pathname],
  );

  const [openSectionId, setOpenSectionId] = useState<string | null>(
    activeSectionId,
  );

  const [sectionScope, setSectionScope] = useState({
    activeSectionId,
    pathname,
  });

  if (
    sectionScope.activeSectionId !== activeSectionId ||
    sectionScope.pathname !== pathname
  ) {
    setSectionScope({ activeSectionId, pathname });
    if (activeSectionId) setOpenSectionId(activeSectionId);
  }

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

  return (
    <div className="flex h-full flex-col">
      {banner && <div className="shrink-0 px-3 pt-4 lg:hidden">{banner}</div>}
      <nav
        aria-label="Docs"
        ref={navRef}
        data-docs-platform={platform}
        className={cn(
          "sidebar-tree-content flex min-h-0 flex-1 flex-col gap-0.5 overflow-x-hidden overflow-y-auto px-3 pt-2 pb-4 lg:pt-4",
        )}
      >
        <LazyMotion features={domAnimation}>
          {sections.map((section) => (
            <SidebarSection
              key={section.$id}
              folder={section}
              isOpen={openSectionId === section.$id}
              onToggle={() => {
                const id = section.$id ?? null;
                setOpenSectionId(openSectionId !== id ? id : null);
              }}
              onNavigate={onNavigate}
              pathname={pathname}
              activePath={activePath}
              isVisible={isVisible}
            />
          ))}
        </LazyMotion>
      </nav>
      {footer && (
        <div className="border-border/50 flex shrink-0 items-center gap-1 border-t px-3 py-2">
          {footer}
        </div>
      )}
    </div>
  );
}
