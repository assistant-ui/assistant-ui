"use client";

import { ChevronDownIcon } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { collapsePanel, fieldInteractive, mono, paper } from "./surfaces";

export interface Source {
  domain: string;
  title: string;
}

export interface SourcesProps {
  sources: readonly Source[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
  /** "grid" (default, unchanged): a two-column card grid, each source's
   * domain and title stacked. "list": one compact line per source (a
   * favicon glyph, then title and domain inline) - a denser arrangement
   * of the same fields, for a caller that wants the source list itself
   * denser than the grid's own cards. */
  layout?: "grid" | "list";
}

/** Both layouts below use it identically - a single favicon-style
 * initial glyph keyed off the domain's own first letter, no icon fetch. */
function SourceGlyph({ domain }: { domain: string }) {
  return (
    <span className="bg-foreground/[0.06] text-foreground/45 flex size-4 shrink-0 items-center justify-center rounded text-[9px] font-medium">
      {domain.charAt(0).toUpperCase()}
    </span>
  );
}

export function Sources({
  sources,
  open,
  onOpenChange,
  className,
  layout = "grid",
}: SourcesProps) {
  return (
    <Collapsible
      data-slot="sources"
      open={open}
      onOpenChange={onOpenChange}
      className={cn("w-full max-w-sm", className)}
    >
      <CollapsibleTrigger
        className={cn(
          fieldInteractive,
          "group/trigger text-foreground/60 hover:text-foreground/90 inline-flex w-fit items-center gap-1.5 rounded-full px-3.5 py-2 text-xs outline-none",
        )}
      >
        <span>Sources</span>
        <span className={cn(mono, "text-foreground/35 tabular-nums")}>
          {sources.length}
        </span>
        <ChevronDownIcon className="size-3 opacity-60 transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] group-data-open/trigger:rotate-180 group-data-panel-open/trigger:rotate-180 motion-reduce:transition-none" />
      </CollapsibleTrigger>
      <CollapsibleContent className={cn(collapsePanel, "outline-none")}>
        {/* `key={index}`, not `source.domain`: two different pages on the
         * same site produce identical keys and collide. `sources` is a
         * complete snapshot on mount for every caller this ships with
         * today (never streamed/reordered/filtered client-side after
         * mount) - a caller that DOES reorder this array incrementally
         * would need real per-source ids instead. */}
        {layout === "list" ? (
          <div className="flex flex-col gap-1 pt-2.5" data-slot="sources-list">
            {sources.map((source, index) => (
              <div
                key={index}
                className="flex items-center gap-2 rounded-lg px-1 py-1"
              >
                <SourceGlyph domain={source.domain} />
                <span className="text-foreground/90 truncate text-[13px] leading-snug">
                  {source.title}
                </span>
                <span
                  className={cn(
                    mono,
                    "text-foreground/35 shrink-0 truncate text-[11px]",
                  )}
                >
                  {source.domain}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 pt-2.5">
            {sources.map((source, index) => (
              <div
                key={index}
                className={cn(
                  paper,
                  "flex flex-col gap-1.5 rounded-2xl p-3 transition-transform hover:-translate-y-px",
                )}
              >
                <div className="flex items-center gap-1.5">
                  <SourceGlyph domain={source.domain} />
                  <span className={cn(mono, "text-foreground/40 truncate")}>
                    {source.domain}
                  </span>
                </div>
                <span className="text-foreground/90 line-clamp-2 text-[13px] leading-snug font-medium">
                  {source.title}
                </span>
              </div>
            ))}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
