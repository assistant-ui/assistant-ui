"use client";

import type { ComponentProps } from "react";
import { DatabaseIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { field, mono, paper, ShimmerLabel } from "./surfaces";
import { announced, pct, take } from "../utils/range";

export interface RetrievalChunk {
  id: string;
  source: string;
  locator: string;
  score: number;
  text: string;
}

export function RetrievalChunks({
  query,
  chunks,
  visibleCount,
  searching,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  "children" | "query" | "chunks" | "visibleCount" | "searching"
> & {
  query: string;
  chunks: readonly RetrievalChunk[];
  visibleCount: number;
  searching: boolean;
}) {
  return (
    <div
      data-slot="retrieval-chunks"
      className={cn("flex w-full max-w-sm flex-col gap-2.5", className)}

      {...props}
    >
      <span
        className={cn(
          field,
          "text-foreground/70 inline-flex w-fit items-center gap-1.5 rounded-full px-3.5 py-2 text-xs",
        )}
      >
        <DatabaseIcon className="text-foreground/40 size-3" />
        {query}
      </span>

      <div className="text-foreground/45 text-xs">
        {searching ? (
          <ShimmerLabel className="relative inline-block leading-none">
            Retrieving
          </ShimmerLabel>
        ) : (
          <span className="fade-in animate-in duration-300">
            {chunks.length} passages above threshold
          </span>
        )}
      </div>

      <div className="flex min-h-[7rem] flex-col gap-1.5">
        {take(chunks, visibleCount).map((chunk) => (
          <div
            key={chunk.id}
            className={cn(
              paper,
              "fade-in slide-in-from-bottom-1 animate-in fill-mode-both flex flex-col gap-1.5 rounded-2xl px-3.5 py-2.5 duration-300",
            )}
          >
            <div className="flex items-baseline gap-2">
              <span className="text-foreground/90 min-w-0 flex-1 truncate text-[13px] font-medium">
                {chunk.source}
              </span>
              <span className={cn(mono, "text-foreground/30 shrink-0")}>
                {chunk.locator}
              </span>
              <span
                className={cn(
                  mono,
                  "shrink-0 tabular-nums",
                  chunk.score >= 0.8
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-foreground/35",
                )}
              >
                {chunk.score.toFixed(2)}
              </span>
            </div>
            <p className="text-foreground/55 line-clamp-2 text-xs leading-relaxed">
              {chunk.text}
            </p>
            <span
              role="meter"
              aria-label={`${chunk.source} relevance score`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={announced(pct(chunk.score, 1))}
              aria-valuetext={`${chunk.score.toFixed(2)} of 1.00`}
              className="bg-foreground/[0.06] h-[2px] w-full overflow-hidden rounded-full"
            >
              <span
                className="block h-full rounded-full bg-blue-500/70 transition-[width] duration-500 dark:bg-blue-400/70"
                style={{ width: `${pct(chunk.score, 1)}%` }}
              />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
