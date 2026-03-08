"use client";

import { useMemo } from "react";
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

export function SidebarTabs({ tabs }: { tabs: SidebarTab[] }) {
  const pathname = usePathname();

  const selected = useMemo(() => {
    return tabs.findLast((item) => isTabActive(item, pathname));
  }, [tabs, pathname]);

  if (tabs.length === 0) return null;

  return (
    <div className="sidebar-tabs-container">
      <nav
        aria-label="Documentation sections"
        className="flex flex-col gap-0.5 rounded-lg border border-border/50 bg-muted/20 p-1"
      >
        {tabs.map((tab) => {
          const isActive = selected && tab.url === selected.url;

          return (
            <Link
              key={tab.url}
              href={tab.url}
              aria-current={isActive ? "true" : undefined}
              className={cn(
                "group relative flex items-start gap-2.5 overflow-hidden rounded-md px-3 py-2 outline-none transition-all duration-150",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                isActive
                  ? "bg-accent/80 text-foreground"
                  : "text-muted-foreground hover:bg-accent/30 hover:text-foreground",
              )}
            >
              {/* Active indicator bar */}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute inset-y-1.5 left-0 w-[2.5px] rounded-r-full bg-foreground/40"
                />
              )}
              {tab.icon && (
                <span
                  className={cn(
                    "mt-[3px] size-4 shrink-0 transition-colors duration-150 [&_svg]:size-full",
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
                    "truncate text-[13px] leading-tight tracking-[-0.01em] transition-all duration-150",
                    isActive ? "font-semibold" : "font-medium",
                  )}
                >
                  {tab.title}
                </span>
                {tab.description && (
                  <span
                    className={cn(
                      "line-clamp-1 text-[11px] leading-snug transition-colors duration-150",
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
          );
        })}
      </nav>
    </div>
  );
}
