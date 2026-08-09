"use client";

import type { ComponentProps } from "react";
import { SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { field, mono } from "./surfaces";

export interface WebSearchResult {
  title: string;
  domain: string;
}

export function WebSearch({
  query,
  results,
  visibleResults,
  searching,
  cycle,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  "children" | "query" | "results" | "visibleResults" | "searching" | "cycle"
> & {
  query: string;
  results: readonly WebSearchResult[];
  visibleResults: number;
  searching: boolean;
  cycle: number;
}) {
  return (
    <div
      data-slot="web-search"
      className={cn("flex w-full max-w-sm flex-col gap-2.5", className)}

      {...props}
    >
      <span
        className={cn(
          field,
          "text-foreground/70 inline-flex w-fit items-center gap-1.5 rounded-full px-3.5 py-2 text-xs",
        )}
      >
        <SearchIcon className="text-foreground/40 size-3" />
        {query}
      </span>
      <div className="text-foreground/45 text-xs">
        {searching ? (
          <span className="relative inline-block leading-none">
            <span>Searching</span>
            <span
              aria-hidden
              className="shimmer pointer-events-none absolute inset-0 motion-reduce:animate-none"
            >
              Searching
            </span>
          </span>
        ) : (
          <span className="fade-in animate-in duration-300">
            Read 3 sources
          </span>
        )}
      </div>
      <div className="flex min-h-[5.75rem] flex-col">
        {results.slice(0, visibleResults).map((result) => (
          <div
            key={`${cycle}-${result.domain}`}
            className="fade-in slide-in-from-bottom-1 animate-in fill-mode-both hover:bg-foreground/[0.03] -mx-2.5 flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 transition-colors duration-300"
          >
            <span className="bg-foreground/[0.06] text-foreground/45 flex size-4 shrink-0 items-center justify-center rounded text-[9px] font-medium">
              {result.domain.charAt(0).toUpperCase()}
            </span>
            <span className="text-foreground/90 min-w-0 flex-1 truncate text-[13.5px]">
              {result.title}
            </span>
            <span className={cn(mono, "text-foreground/35 shrink-0")}>
              {result.domain}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
