"use client";

import * as HeatGraphPrimitive from "heat-graph";
import { cn } from "@/lib/utils";

const LEVEL_TINT = [
  "bg-foreground/[0.06]",
  "bg-blue-500/25 dark:bg-blue-400/25",
  "bg-blue-500/45 dark:bg-blue-400/45",
  "bg-blue-500/70 dark:bg-blue-400/70",
  "bg-blue-500 dark:bg-blue-400",
] as const;

export function HeatGraph({ data }: { data: HeatGraphPrimitive.DataPoint[] }) {
  return (
    <HeatGraphPrimitive.Root
      data={data}
      weekStart="monday"
      className="flex flex-col gap-2"
    >
      <div className="overflow-x-auto">
        <div className="flex min-w-fit flex-col gap-2">
          <MonthLabels />
          <div className="flex gap-2">
            <DayLabels />
            <CellGrid />
          </div>
        </div>
      </div>
      <GraphLegend />
      <CellTooltip />
    </HeatGraphPrimitive.Root>
  );
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// A month is labelled at its first week, so the leading partial month and a month starting in the current week stay unlabelled instead of colliding with a neighbour or running past the grid.
function labelsMonth({ date, row }: HeatGraphPrimitive.CellData) {
  return (
    row === 0 && date.getDate() <= 7 && date.getTime() + WEEK_MS <= Date.now()
  );
}

function MonthLabels() {
  return (
    <HeatGraphPrimitive.Grid
      className="ms-10 h-5 gap-x-[3px] overflow-hidden"
      style={{ gridTemplateRows: "auto" }}
    >
      {({ cell }) =>
        labelsMonth(cell) ? (
          <span
            className="text-muted-foreground w-0 text-xs whitespace-nowrap"
            style={{ gridColumn: cell.column + 1, gridRow: 1 }}
          >
            {HeatGraphPrimitive.MONTH_SHORT[cell.date.getMonth()]}
          </span>
        ) : null
      }
    </HeatGraphPrimitive.Grid>
  );
}

function DayLabels() {
  return (
    <div className="flex w-8 shrink-0 flex-col justify-between py-[2px]">
      <HeatGraphPrimitive.DayLabels>
        {({ label }) => (
          <span className="text-muted-foreground flex h-[13px] items-center text-xs">
            {label.row % 2 === 0
              ? HeatGraphPrimitive.DAY_SHORT[label.dayOfWeek]
              : ""}
          </span>
        )}
      </HeatGraphPrimitive.DayLabels>
    </div>
  );
}

function CellGrid() {
  return (
    <HeatGraphPrimitive.Grid className="flex-1 gap-[3px]">
      {({ cell }) => (
        <HeatGraphPrimitive.Cell
          className={cn(
            "aspect-square w-full min-w-[9px] rounded-sm",
            LEVEL_TINT[cell.level] ?? LEVEL_TINT[0],
          )}
        />
      )}
    </HeatGraphPrimitive.Grid>
  );
}

function CellTooltip() {
  return (
    <HeatGraphPrimitive.Tooltip className="bg-foreground text-background pointer-events-none rounded-md px-3 py-1.5 text-xs whitespace-nowrap">
      {({ cell }) => (
        <>
          <strong>{cell.count} contributions</strong> on{" "}
          {cell.date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </>
      )}
    </HeatGraphPrimitive.Tooltip>
  );
}

function GraphLegend() {
  return (
    <div className="text-muted-foreground ms-auto flex items-center gap-1 text-xs">
      <span>Less</span>
      <HeatGraphPrimitive.Legend>
        {({ item }) => (
          <HeatGraphPrimitive.LegendLevel
            className={cn(
              "h-[13px] w-[13px] rounded-sm",
              LEVEL_TINT[item.level] ?? LEVEL_TINT[0],
            )}
          />
        )}
      </HeatGraphPrimitive.Legend>
      <span>More</span>
    </div>
  );
}
