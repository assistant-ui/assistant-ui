"use client";

import { useMemo } from "react";
import * as HeatGraph from "heat-graph";
import type { ActivityPoint } from "@/lib/traction";

const COMMIT_COLORS = [
  "color-mix(in oklab, var(--color-muted-foreground) 14%, transparent)",
  "color-mix(in oklab, var(--color-chart-1) 30%, transparent)",
  "color-mix(in oklab, var(--color-chart-1) 55%, transparent)",
  "color-mix(in oklab, var(--color-chart-1) 80%, transparent)",
  "var(--color-chart-1)",
];

const RELEASE_RING = "inset 0 0 0 1.5px var(--color-chart-2)";

const formatDate = (date: Date) =>
  date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const localDateKey = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export function ActivityHeatmap({
  commits,
  releases,
}: {
  commits: ActivityPoint[];
  releases: ActivityPoint[];
}) {
  const releaseDays = useMemo(() => {
    const set = new Set<string>();
    for (const r of releases) {
      if (r.count > 0) set.add(r.date);
    }
    return set;
  }, [releases]);

  if (commits.length === 0 && releases.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-lg border border-border border-dashed text-muted-foreground text-sm">
        Activity is currently unavailable.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border p-4 md:p-5">
      <HeatGraph.Root
        data={commits}
        weekStart="sunday"
        colorScale={COMMIT_COLORS}
        className="flex flex-col"
      >
        <div
          className="relative"
          style={{ height: 14, marginLeft: 28, marginBottom: 6 }}
        >
          <HeatGraph.MonthLabels>
            {({ label, totalWeeks }) => (
              <span
                className="absolute text-[11px] text-muted-foreground leading-[14px]"
                style={{ left: `${(label.column / totalWeeks) * 100}%` }}
              >
                {HeatGraph.MONTH_SHORT[label.month]}
              </span>
            )}
          </HeatGraph.MonthLabels>
        </div>

        <div className="flex" style={{ gap: 3 }}>
          <div className="flex shrink-0 flex-col" style={{ width: 25, gap: 3 }}>
            <HeatGraph.DayLabels>
              {({ label }) => (
                <span
                  className="relative text-[10px] text-muted-foreground"
                  style={{ height: 11 }}
                >
                  {label.row % 2 === 1 ? (
                    <span className="absolute" style={{ bottom: -1 }}>
                      {HeatGraph.DAY_SHORT[label.dayOfWeek]?.charAt(0)}
                    </span>
                  ) : null}
                </span>
              )}
            </HeatGraph.DayLabels>
          </div>

          <HeatGraph.Grid
            style={{
              gap: 3,
              gridTemplateRows: "repeat(7, 11px)",
              flex: 1,
              minWidth: 0,
            }}
          >
            {({ cell }) => {
              const released = releaseDays.has(localDateKey(cell.date));
              return (
                <HeatGraph.Cell
                  className="rounded-[2px]"
                  style={released ? { boxShadow: RELEASE_RING } : undefined}
                />
              );
            }}
          </HeatGraph.Grid>
        </div>

        <div
          className="flex flex-wrap items-center justify-end text-[11px] text-muted-foreground"
          style={{ marginTop: 10, gap: 12 }}
        >
          <div className="flex items-center" style={{ gap: 4 }}>
            <span>Less</span>
            <HeatGraph.Legend>
              {() => (
                <HeatGraph.LegendLevel
                  className="rounded-[2px]"
                  style={{ width: 10, height: 10 }}
                />
              )}
            </HeatGraph.Legend>
            <span>More</span>
          </div>
          <div className="flex items-center" style={{ gap: 6 }}>
            <span
              className="rounded-[2px]"
              style={{
                width: 10,
                height: 10,
                backgroundColor:
                  "color-mix(in oklab, var(--color-muted-foreground) 14%, transparent)",
                boxShadow: RELEASE_RING,
              }}
            />
            <span>Released</span>
          </div>
        </div>

        <HeatGraph.Tooltip className="pointer-events-none whitespace-nowrap rounded-md border border-border bg-popover px-3 py-1.5 text-popover-foreground text-xs shadow-md">
          {({ cell }) => {
            const released = releaseDays.has(localDateKey(cell.date));
            const headline =
              cell.count > 0
                ? `${cell.count} ${cell.count === 1 ? "commit" : "commits"}`
                : released
                  ? "Released"
                  : "No commits";
            return (
              <>
                <strong>{headline}</strong>
                {released && cell.count > 0 ? (
                  <span style={{ color: "var(--color-chart-2)" }}>
                    {" · released"}
                  </span>
                ) : null}
                {" — "}
                {formatDate(cell.date)}
              </>
            );
          }}
        </HeatGraph.Tooltip>
      </HeatGraph.Root>
    </div>
  );
}
