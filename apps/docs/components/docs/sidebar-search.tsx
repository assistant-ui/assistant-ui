"use client";

import { Search } from "lucide-react";
import { useSearchContext } from "fumadocs-ui/contexts/search";
import { Button } from "@/components/ui/button";

export function SidebarSearch() {
  const { setOpenSearch, hotKey } = useSearchContext();

  return (
    <Button variant="outline" onClick={() => setOpenSearch(true)}>
      <Search className="size-4" />
      <span>Search</span>
      <div className="ml-auto flex gap-0.5">
        {hotKey.map((k, i) => (
          <kbd
            key={i}
            className="rounded border bg-background px-1.5 font-medium text-[10px]"
          >
            {k.display}
          </kbd>
        ))}
      </div>
    </Button>
  );
}
