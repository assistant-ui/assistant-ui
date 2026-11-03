"use client";

import type { DataPoint } from "heat-graph";
import { ActivityGraph } from "@/components/assistant-ui/elements/activity-graph";
import { defineStates } from "./types";

const dayAfter = (start: Date, offset: number) =>
  new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset);

const series = (
  start: Date,
  days: number,
  count: (i: number, weekend: boolean) => number,
): DataPoint[] =>
  Array.from({ length: days }, (_, i) => {
    const date = dayAfter(start, i);
    const day = date.getDay();
    return { date, count: count(i, day === 0 || day === 6) };
  });

const total = (data: readonly DataPoint[]) =>
  data.reduce((sum, point) => sum + point.count, 0).toLocaleString("en-US");

const HALF_YEAR_START = new Date(2026, 1, 2);
const HALF_YEAR_END = dayAfter(HALF_YEAR_START, 181);

const SPARSE = series(HALF_YEAR_START, 182, (i) =>
  [12, 13, 47, 48, 49, 103, 150, 151, 176].includes(i) ? 2 + (i % 4) : 0,
);

const YEAR_START = new Date(2025, 10, 3);
const YEAR = series(YEAR_START, 364, (i, weekend) => {
  const wave = Math.abs(Math.sin(i * 0.13)) + Math.abs(Math.cos(i * 0.05));
  return weekend ? Math.round(wave) : Math.round(wave * 8) + ((i * 5) % 3);
});

const MONTH_START = new Date(2026, 9, 5);
const MONTH = series(MONTH_START, 28, (i, weekend) =>
  weekend ? 0 : 3 + ((i * 7) % 6),
);

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "empty",
    label: "No activity",
    note: "No runs in the range, so every cell is at the lowest level.",
    Component: () => (
      <ActivityGraph
        data={[]}
        start={HALF_YEAR_START}
        end={HALF_YEAR_END}
        title="Agent runs"
        total="0 in 6 months"
      />
    ),
  },
  {
    key: "sparse",
    label: "Sparse",
    note: "A handful of active days in an otherwise quiet half-year.",
    Component: () => (
      <ActivityGraph
        data={SPARSE}
        start={HALF_YEAR_START}
        end={HALF_YEAR_END}
        title="Scheduled reports"
        total={`${total(SPARSE)} in 6 months`}
      />
    ),
  },
  {
    key: "short-range",
    label: "Four weeks",
    note: "A short range draws only a few columns.",
    Component: () => (
      <ActivityGraph
        data={MONTH}
        start={MONTH_START}
        end={dayAfter(MONTH_START, 27)}
        title="Agent runs"
        total={`${total(MONTH)} in 4 weeks`}
      />
    ),
  },
  {
    key: "long-content",
    label: "Full year",
    note: "A year of weeks overflows the card and opens scrolled to the newest.",
    Component: () => (
      <ActivityGraph
        data={YEAR}
        start={YEAR_START}
        end={dayAfter(YEAR_START, 363)}
        title="Agent runs"
        total={`${total(YEAR)} in 12 months`}
      />
    ),
  },
]);
