"use client";

import { Search } from "lucide-react";
import { useSearchContext } from "fumadocs-ui/contexts/search";

export function SidebarSearch() {
  const { setOpenSearch, hotKey } = useSearchContext();

  return (
    <button
      type="button"
      data-sidebar-control
      onClick={() => setOpenSearch(true)}
      className="bg-muted text-muted-foreground hover:bg-accent hover:text-foreground flex h-9 w-full items-center gap-2 rounded-lg px-3 text-sm transition-colors"
    >
      <Search className="size-4 shrink-0" />
      <span className="flex-1 text-left">Search...</span>
      <div className="flex gap-0.5">
        {hotKey.map((k, i) => (
          <kbd
            key={i}
            className="bg-background text-muted-foreground rounded px-1.5 py-0.5 text-[10px] font-medium"
          >
            {k.display}
          </kbd>
        ))}
      </div>
    </button>
  );
}
