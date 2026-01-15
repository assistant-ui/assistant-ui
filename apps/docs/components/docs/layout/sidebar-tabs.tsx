"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const selected = useMemo(() => {
    return tabs.findLast((item) => isTabActive(item, pathname));
  }, [tabs, pathname]);

  if (!selected) return null;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-9 w-full justify-between px-3">
          <span className="inline-flex items-center gap-2">
            {selected.icon && (
              <span className="size-4 shrink-0 [&_svg]:size-full">
                {selected.icon}
              </span>
            )}
            <span className="font-medium text-sm">{selected.title}</span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
      >
        {tabs.map((tab) => {
          const isActive = selected && tab.url === selected.url;

          return (
            <DropdownMenuItem key={tab.url} asChild className="cursor-pointer">
              <Link
                href={tab.url}
                onClick={() => setOpen(false)}
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
                    !isActive && "invisible",
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
