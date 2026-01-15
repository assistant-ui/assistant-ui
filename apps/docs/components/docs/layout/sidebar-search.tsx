"use client";

import { Search } from "lucide-react";
import { useSearchContext } from "fumadocs-ui/contexts/search";

export function SidebarSearch() {
  const { setOpenSearch, hotKey } = useSearchContext();

  return (
    <button
      data-sidebar-control
      onClick={() => setOpenSearch(true)}
      className="flex h-9 w-full items-center gap-2 rounded-lg bg-muted px-3 text-muted-foreground text-sm transition-colors hover:bg-accent hover:text-foreground"
    >
      <Search className="size-4 shrink-0" />
      <span className="flex-1 text-left">Search...</span>
      <div className="flex gap-0.5">
        {hotKey.map((k, i) => (
          <kbd
            key={i}
            className="rounded bg-background px-1.5 py-0.5 font-medium text-[10px] text-muted-foreground"
          >
            {k.display}
          </kbd>
        ))}
      </div>
    </button>
  );
}
