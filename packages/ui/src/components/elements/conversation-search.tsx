"use client";

import type { ComponentProps } from "react";
import { ChevronDownIcon, ChevronUpIcon, SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { field, ghostButton, mono, paper } from "./surfaces";

export interface SearchHit {
  id: string;
  before: string;
  match: string;
  after: string;
  position: number;
}

export function ConversationSearch({
  query,
  hits,
  activeIndex,
  onQueryChange,
  onStep,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  "children" | "query" | "hits" | "activeIndex" | "onQueryChange" | "onStep"
> & {
  query: string;
  hits: readonly SearchHit[];
  activeIndex: number;
  onQueryChange?: (query: string) => void;
  onStep?: (delta: number) => void;
}) {
  const index =
    hits.length === 0
      ? -1
      : Math.min(Math.max(activeIndex, 0), hits.length - 1);
  const active = index === -1 ? undefined : hits[index];

  return (
    <div
      data-slot="conversation-search"
      className={cn("flex w-full max-w-sm gap-2", className)}

      {...props}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div
          className={cn(
            paper,
            "flex items-center gap-2 rounded-full py-1.5 pr-1.5 pl-3",
          )}
        >
          <SearchIcon className="text-foreground/30 size-3.5 shrink-0" />
          <input
            value={query}
            onChange={(event) => onQueryChange?.(event.target.value)}
            placeholder="Find in conversation"
            aria-label="Find in conversation"
            className="text-foreground/85 placeholder:text-foreground/30 min-w-0 flex-1 bg-transparent text-[13px] outline-none"
          />
          <span
            className={cn(mono, "text-foreground/30 shrink-0 tabular-nums")}
          >
            {hits.length === 0 ? "0" : `${index + 1}/${hits.length}`}
          </span>
          <button
            type="button"
            aria-label="Previous match"
            onClick={() => onStep?.(-1)}
            className={cn(ghostButton, "size-6 shrink-0")}
          >
            <ChevronUpIcon className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label="Next match"
            onClick={() => onStep?.(1)}
            className={cn(ghostButton, "size-6 shrink-0")}
          >
            <ChevronDownIcon className="size-3.5" />
          </button>
        </div>

        {active && (
          <div
            className={cn(
              field,
              "fade-in animate-in rounded-xl px-3 py-2 text-xs leading-relaxed duration-200",
            )}
          >
            <span className="text-foreground/45">{active.before}</span>
            <span className="text-foreground/95 rounded bg-amber-400/35 px-0.5">
              {active.match}
            </span>
            <span className="text-foreground/45">{active.after}</span>
          </div>
        )}
      </div>

      <div className="bg-foreground/[0.04] relative w-1.5 shrink-0 rounded-full">
        {hits.map((hit, i) => (
          <span
            key={hit.id}
            aria-hidden
            className={cn(
              "absolute inset-x-0 h-1 rounded-full transition-colors duration-200",
              i === index ? "bg-amber-500" : "bg-amber-500/35",
            )}
            style={{ top: `${hit.position}%` }}
          />
        ))}
      </div>
    </div>
  );
}
