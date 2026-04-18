"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { SidebarTab } from "./sidebar-tabs.server";

export type { SidebarTab };

function normalizePathname(pathname: string): string {
  return pathname.replace(/\/$/, "");
}

function isTabActive(tab: SidebarTab, pathname: string): boolean {
  const normalized = normalizePathname(pathname);
  if (tab.urls) return tab.urls.has(normalized);
  return normalized.startsWith(normalizePathname(tab.url));
}

type Rect = { top: number; height: number; left: number; width: number };

function useSlidingIndicator(
  containerRef: React.RefObject<HTMLElement | null>,
  activeIndex: number,
  selector: string,
) {
  const [rect, setRect] = useState<Rect | null>(null);
  const hasAnimated = useRef(false);

  const update = useCallback(() => {
    const container = containerRef.current;
    if (!container || activeIndex < 0) {
      setRect(null);
      return;
    }
    const els = container.querySelectorAll<HTMLElement>(selector);
    const el = els[activeIndex];
    if (!el) {
      setRect(null);
      return;
    }
    setRect({
      top: el.offsetTop,
      left: el.offsetLeft,
      height: el.offsetHeight,
      width: el.offsetWidth,
    });
  }, [containerRef, activeIndex, selector]);

  useEffect(() => {
    update();
    // After first render, enable transitions
    requestAnimationFrame(() => {
      hasAnimated.current = true;
    });
  }, [update]);

  return { rect, animate: hasAnimated.current };
}

function ChildPills({
  items,
  pathname,
}: {
  items: SidebarTab[];
  pathname: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeIndex = items.findIndex((child) => isTabActive(child, pathname));
  const { rect, animate } = useSlidingIndicator(containerRef, activeIndex, "a");

  return (
    <div
      ref={containerRef}
      className="relative flex flex-wrap gap-1 pt-1 pr-3 pb-1.5 pl-7"
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute rounded-md bg-foreground/10",
          animate && "transition-all duration-200 ease-out",
          rect ? "opacity-100" : "opacity-0",
        )}
        style={
          rect
            ? {
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
              }
            : undefined
        }
      />
      {items.map((child) => {
        const childActive = isTabActive(child, pathname);
        return (
          <Link
            key={child.url}
            href={child.url}
            className={cn(
              "relative z-[1] flex items-center gap-1 rounded-md px-2 py-0.5 font-medium text-[11.5px] transition-colors duration-200",
              childActive
                ? "text-foreground"
                : "text-muted-foreground/70 hover:text-muted-foreground",
            )}
          >
            {child.icon && (
              <span className="size-3 shrink-0 [&_svg]:size-full">
                {child.icon}
              </span>
            )}
            {child.title}
          </Link>
        );
      })}
    </div>
  );
}

export function SidebarTabs({ tabs }: { tabs: SidebarTab[] }) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);

  const activeIndex = useMemo(() => {
    return tabs.findLastIndex((item) => isTabActive(item, pathname));
  }, [tabs, pathname]);

  const { rect, animate } = useSlidingIndicator(
    navRef,
    activeIndex,
    "[data-tab-link]",
  );

  if (tabs.length === 0) return null;

  return (
    <div className="sidebar-tabs-container">
      <nav
        ref={navRef}
        aria-label="Documentation sections"
        className="relative flex flex-col gap-0.5 rounded-lg border border-border/50 bg-muted/20 p-1"
      >
        {/* Sliding active background */}
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute rounded-md bg-accent/80",
            animate && "transition-all duration-250 ease-out",
            rect ? "opacity-100" : "opacity-0",
          )}
          style={
            rect
              ? {
                  top: rect.top,
                  left: rect.left,
                  width: rect.width,
                  height: rect.height,
                }
              : undefined
          }
        />

        {tabs.map((tab) => {
          const isActive =
            activeIndex >= 0 && tab.url === tabs[activeIndex]!.url;
          const hasChildren = tab.children && tab.children.length > 0;

          return (
            <div key={tab.url}>
              <Link
                data-tab-link=""
                href={tab.url}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "group relative z-1 flex items-center gap-2.5 rounded-md px-3 py-2 outline-none transition-colors duration-200",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:bg-accent/30 hover:text-foreground",
                )}
              >
                {/* Left indicator bar */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-y-1.5 left-0 w-[2.5px] rounded-r-full bg-foreground/40 transition-opacity duration-200",
                    isActive ? "opacity-100" : "opacity-0",
                  )}
                />
                {tab.icon && (
                  <span
                    className={cn(
                      "size-4 shrink-0 transition-colors duration-200 [&_svg]:size-full",
                      isActive
                        ? "text-foreground"
                        : "text-muted-foreground/60 group-hover:text-muted-foreground",
                    )}
                  >
                    {tab.icon}
                  </span>
                )}
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span
                    className={cn(
                      "truncate text-[13px] leading-tight tracking-[-0.01em] transition-all duration-200",
                      isActive ? "font-semibold" : "font-medium",
                    )}
                  >
                    {tab.title}
                  </span>
                  {tab.description && !hasChildren && (
                    <span
                      className={cn(
                        "line-clamp-1 text-[11px] leading-snug transition-colors duration-200",
                        isActive
                          ? "text-muted-foreground"
                          : "text-muted-foreground/60 group-hover:text-muted-foreground/80",
                      )}
                    >
                      {tab.description}
                    </span>
                  )}
                </span>
              </Link>

              {/* Sub-items — always visible */}
              {hasChildren && (
                <ChildPills items={tab.children!} pathname={pathname} />
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}
