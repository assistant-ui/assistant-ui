"use client";

import { Check, ChevronDownIcon } from "lucide-react";
import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/shared/dropdown-menu";
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

  if (!selected) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-sidebar-control
        className="flex h-9 w-full items-center gap-2 rounded-lg bg-muted px-3 text-sm transition-colors hover:bg-accent hover:text-foreground"
      >
        {selected.icon && (
          <span className="size-4 shrink-0 text-muted-foreground [&_svg]:size-full">
            {selected.icon}
          </span>
        )}
        <span className="flex-1 text-left font-medium">{selected.title}</span>
        <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
      >
        {tabs.map((tab) => {
          const isActive = selected && tab.url === selected.url;

          return (
            <DropdownMenuItem key={tab.url} asChild>
              <Link
                href={tab.url}
                className="flex items-start justify-between gap-2"
              >
                <span className="inline-flex items-start gap-2">
                  {tab.icon && (
                    <span className="mt-0.5 size-4 shrink-0 [&_svg]:size-full">
                      {tab.icon}
                    </span>
                  )}
                  <span className="flex flex-col">
                    <span className="text-sm">{tab.title}</span>
                    {tab.description && (
                      <span className="text-muted-foreground text-xs">
                        {tab.description}
                      </span>
                    )}
                  </span>
                </span>
                <Check
                  className={cn(
                    "mt-0.5 size-4 shrink-0",
                    isActive ? "opacity-100" : "opacity-0",
                  )}
                />
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
