"use client";

import * as HeatGraph from "heat-graph";
import { cn } from "@/lib/utils";
import { mono, paper } from "./surfaces";

const LEVEL_TINT = [
  "bg-foreground/[0.06]",
  "bg-blue-500/25 dark:bg-blue-400/25",
  "bg-blue-500/45 dark:bg-blue-400/45",
  "bg-blue-500/70 dark:bg-blue-400/70",
  "bg-blue-500 dark:bg-blue-400",
] as const;

export function ActivityGraph({
  data,
  start,
  end,
  title,
  total,
  className,
}: {
  data: readonly HeatGraph.DataPoint[];
  start: string | Date;
  end: string | Date;
  title: string;
  total: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        paper,
        "flex w-full max-w-sm flex-col gap-3 rounded-2xl p-4",
        className,
      )}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-[13.5px] font-medium">{title}</span>
        <span className={cn(mono, "text-foreground/35 tabular-nums")}>
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
        <div className="flex gap-2 overflow-x-auto">
          <div className="flex shrink-0 flex-col gap-[3px]">
            <HeatGraph.DayLabels>
              {({ label }) => (
                <span
                  className={cn(
                    mono,
                    "text-foreground/25 flex h-[9px] items-center leading-none",
                  )}
                >
                  {label.row % 2 === 1
                    ? HeatGraph.DAY_SHORT[label.dayOfWeek]
                    : ""}
                </span>
              )}
            </HeatGraph.DayLabels>
          </div>

          <HeatGraph.Grid className="gap-[3px]">
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

        <div className="flex items-center gap-1.5 self-end">
          <span className={cn(mono, "text-foreground/25")}>less</span>
          {LEVEL_TINT.map((tint, level) => (
            <span
              key={level}
              aria-hidden
              className={cn("size-[9px] rounded-[2px]", tint)}
            />
          ))}
          <span className={cn(mono, "text-foreground/25")}>more</span>
        </div>
      </HeatGraph.Root>
    </div>
  );
}
