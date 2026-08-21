"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { mono, paper } from "./surfaces";
import { pct } from "./range";

const fmt = (n: number) => n.toLocaleString("en-US");

export interface ContextSegment {
  label: string;
  tokens: number;
  tint: string;
}

export function ContextBreakdown({
  segments,
  limit,
  className,
  ...props
}: Omit<ComponentProps<"div">, "children" | "segments" | "limit"> & {
  segments: readonly ContextSegment[];
  limit: number;
}) {
  const used = segments.reduce((sum, segment) => sum + segment.tokens, 0);
  const pressure = limit === 0 ? 0 : used / limit;
  const share = (tokens: number) => pct(tokens, limit);

  return (
    <div
      data-slot="context-breakdown"
      className={cn(
        paper,
        "flex w-full max-w-sm flex-col gap-3 rounded-2xl p-4",
        className,
      )}

      {...props}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-[13.5px] font-medium">Context</span>
        <span
          className={cn(
            mono,
            "tabular-nums",
            pressure > 0.85
              ? "text-amber-600 dark:text-amber-400"
              : "text-foreground/35",
          )}
        >
          {fmt(used)} / {fmt(limit)}
        </span>
      </div>

      <div className="bg-foreground/[0.06] flex h-2 w-full overflow-hidden rounded-full">
        {segments.map((segment) => (
          <span
            key={segment.label}
            className={cn(
              "h-full transition-[width] duration-500 ease-out motion-reduce:transition-none",
              segment.tint,
            )}
            style={{ width: `${share(segment.tokens)}%` }}
          />
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        {segments.map((segment) => (
          <div key={segment.label} className="flex items-center gap-2">
            <span
              aria-hidden
              className={cn("size-2 shrink-0 rounded-full", segment.tint)}
            />
            <span className="text-foreground/70 min-w-0 flex-1 truncate text-[13px]">
              {segment.label}
            </span>
            <span
              className={cn(mono, "text-foreground/35 shrink-0 tabular-nums")}
            >
              {fmt(segment.tokens)}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="bg-foreground/[0.08] size-2 shrink-0 rounded-full"
          />
          <span className="text-foreground/35 min-w-0 flex-1 truncate text-[13px]">
            Headroom
          </span>
          <span
            className={cn(mono, "text-foreground/25 shrink-0 tabular-nums")}
          >
            {fmt(Math.max(0, limit - used))}
          </span>
        </div>
      </div>
    </div>
  );
}
