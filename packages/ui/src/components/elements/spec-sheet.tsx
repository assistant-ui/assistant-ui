"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { mono, paper } from "./surfaces";

export interface SpecRow {
  label: string;
  value: string;
  emphasis?: boolean;
}

export function SpecSheet({
  title,
  subtitle,
  rows,
  visibleCount,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  "children" | "title" | "subtitle" | "rows" | "visibleCount"
> & {
  title: string;
  subtitle?: string;
  rows: readonly SpecRow[];
  visibleCount: number;
}) {
  return (
    <div
      data-slot="spec-sheet"
      className={cn(
        paper,
        "flex w-full max-w-sm flex-col gap-3 rounded-2xl p-4",
        className,
      )}

      {...props}
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-[13.5px] font-medium">{title}</span>
        {subtitle && (
          <span className="text-foreground/45 text-xs">{subtitle}</span>
        )}
      </div>

      <div className="flex flex-col">
        {rows.slice(0, visibleCount).map((row) => (
          <div
            key={row.label}
            className="border-foreground/[0.06] fade-in animate-in fill-mode-both flex items-baseline gap-3 border-t py-1.5 duration-300 first:border-t-0 first:pt-0"
          >
            <span className={cn(mono, "text-foreground/35 w-24 shrink-0")}>
              {row.label}
            </span>
            <span
              className={cn(
                "min-w-0 flex-1 text-end text-[13px] tabular-nums",
                row.emphasis
                  ? "text-foreground/95 font-medium"
                  : "text-foreground/70",
              )}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
