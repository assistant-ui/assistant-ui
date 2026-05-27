"use client";

import * as HeatGraphPrimitive from "heat-graph";

const COLORS = ["#ebedf0", "#c6d7f9", "#8fb0f3", "#5888e8", "#2563eb"];

export function HeatGraph({ data }: { data: HeatGraphPrimitive.DataPoint[] }) {
  return (
    <HeatGraphPrimitive.Root
      data={data}
      weekStart="monday"
      colorScale={COLORS}
      className="flex flex-col gap-2"
    >
      <MonthLabels />
      <div className="flex gap-2">
        <DayLabels />
        <CellGrid />
      </div>
      <GraphLegend />
      <CellTooltip />
    </HeatGraphPrimitive.Root>
  );
}

function MonthLabels() {
  return (
    <div className="relative ms-10 h-5">
      <HeatGraphPrimitive.MonthLabels>
        {({ label, totalWeeks }) => (
          <span
            className="absolute text-xs text-gray-500"
            style={{ left: `${(label.column / totalWeeks) * 100}%` }}
          >
            {HeatGraphPrimitive.MONTH_SHORT[label.month]}
          </span>
        )}
      </HeatGraphPrimitive.MonthLabels>
    </div>
  );
}

function DayLabels() {
  return (
    <div className="flex w-8 shrink-0 flex-col justify-between py-[2px]">
      <HeatGraphPrimitive.DayLabels>
        {({ label }) => (
          <span className="flex h-[13px] items-center text-xs text-gray-500">
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
      {() => (
        <HeatGraphPrimitive.Cell className="aspect-square w-full rounded-sm" />
      )}
    </HeatGraphPrimitive.Grid>
  );
}

function CellTooltip() {
  return (
    <HeatGraphPrimitive.Tooltip className="pointer-events-none rounded-md bg-gray-900 px-3 py-1.5 text-xs whitespace-nowrap text-white shadow-lg">
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
    <div className="ms-auto flex items-center gap-1 text-xs text-gray-500">
      <span>Less</span>
      <HeatGraphPrimitive.Legend>
        {() => (
          <HeatGraphPrimitive.LegendLevel className="h-[13px] w-[13px] rounded-sm" />
        )}
      </HeatGraphPrimitive.Legend>
      <span>More</span>
    </div>
  );
}
