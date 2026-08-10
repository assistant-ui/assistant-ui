"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { mono, paper } from "./surfaces";

export interface ModelUsage {
  name: string;
  context: string;
  cost: string;
}

export interface DataTableProps extends Omit<
  ComponentProps<"div">,
  "children"
> {
  rows: readonly ModelUsage[];
  cycle: number;
}

export function DataTable({
  rows,
  cycle,
  className,
  ...props
}: DataTableProps) {
  return (
    <div
      data-slot="data-table"
      className={cn(
        paper,
        "w-full max-w-sm overflow-hidden rounded-2xl text-[13px]",
        className,
      )}

      {...props}
    >
      <div className="flex items-center px-4 pt-3 pb-2">
        <span className={cn(mono, "text-foreground/35 flex-1")}>Model</span>
        <span className={cn(mono, "text-foreground/35 w-16 text-end")}>
          Context
        </span>
        <span className={cn(mono, "text-foreground/35 w-16 text-end")}>
          Cost
        </span>
      </div>
      <div className="bg-foreground/[0.06] mx-4 h-px" />
      <div key={cycle}>
        {rows.map((row, index) => (
          <div
            key={row.name}
            className="fade-in slide-in-from-bottom-1 animate-in fill-mode-both hover:bg-foreground/[0.03] flex items-center gap-2.5 px-4 py-2.5 transition-colors duration-300"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <span className="bg-foreground/[0.06] text-foreground/45 flex size-5 shrink-0 items-center justify-center rounded-md text-[9px] font-medium">
              {row.name[0]!}
            </span>
            <span className="text-foreground/90 flex-1 truncate">
              {row.name}
            </span>
            <span
              className={cn(
                mono,
                "text-foreground/55 w-16 text-end tabular-nums",
              )}
            >
              {row.context}
            </span>
            <span
              className={cn(
                mono,
                "text-foreground/55 w-16 text-end tabular-nums",
              )}
            >
              {row.cost}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
