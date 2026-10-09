"use client";

import type { ComponentProps } from "react";
import * as HeatGraph from "heat-graph";
import { cn } from "@/lib/utils";
import { mono, paper } from "./surfaces";

const LEVEL_TINT = [
  "bg-foreground/[0.06] inset-ring inset-ring-border forced-colors:border",
  "bg-blue-500/25 dark:bg-blue-400/25 forced-color-adjust-none",
  "bg-blue-500/45 dark:bg-blue-400/45 forced-color-adjust-none",
  "bg-blue-500/70 dark:bg-blue-400/70 forced-color-adjust-none",
  "bg-blue-500 dark:bg-blue-400 forced-color-adjust-none",
] as const;

export function ActivityGraph({
  data,
  start,
  end,
  title,
  total,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  "children" | "data" | "start" | "end" | "title" | "total"
> & {
  data: readonly HeatGraph.DataPoint[];
  start: string | Date;
  end: string | Date;
  title: string;
  total: string;
}) {
  return (
    <div
      data-slot="activity-graph"
      className={cn(
        paper,
        "flex w-full max-w-sm flex-col gap-3 rounded-2xl p-4",
        className,
      )}

      {...props}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-[13.5px] font-medium">{title}</span>
        <span className={cn(mono, "text-muted-foreground tabular-nums")}>
          {total}
        </span>
      </div>

      <HeatGraph.Root
        data={[...data]}
        start={start}
        end={end}
        weekStart="monday"
        className="flex flex-col gap-2"
      >
        <div className="flex gap-2">
          <div className="flex shrink-0 flex-col gap-[3px]">
            <HeatGraph.DayLabels>
              {({ label }) => (
                <span
                  className={cn(
                    mono,
                    "text-muted-foreground flex h-[9px] items-center leading-none",
                  )}
                >
                  {label.row % 2 === 1
                    ? HeatGraph.DAY_SHORT[label.dayOfWeek]
                    : ""}
                </span>
              )}
            </HeatGraph.DayLabels>
          </div>

          {/* A reversed row starts scrolled to its end, so a narrow graph opens on the newest weeks. */}
          <div className="flex min-w-0 flex-row-reverse overflow-x-auto">
            <HeatGraph.Grid className="shrink-0 gap-[3px]">
              {({ cell }) => (
                <HeatGraph.Cell
                  className={cn(
                    "size-[9px] rounded-[2px]",
                    LEVEL_TINT[cell.level] ?? LEVEL_TINT[0],
                  )}
                />
              )}
            </HeatGraph.Grid>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-end">
          <span className={cn(mono, "text-muted-foreground")}>less</span>
          {LEVEL_TINT.map((tint, level) => (
            <span
              key={level}
              aria-hidden
              className={cn("size-[9px] rounded-[2px]", tint)}
            />
          ))}
          <span className={cn(mono, "text-muted-foreground")}>more</span>
        </div>
      </HeatGraph.Root>
    </div>
  );
}
