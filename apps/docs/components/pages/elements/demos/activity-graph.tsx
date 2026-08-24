"use client";

import type { DataPoint } from "heat-graph";
import { ActivityGraph } from "@/components/elements/activity-graph";

const START = new Date(2026, 1, 2);
const DAYS = 182;
const dayAfterStart = (offset: number) =>
  new Date(START.getFullYear(), START.getMonth(), START.getDate() + offset);
const END = dayAfterStart(DAYS - 1);

const DATA: readonly DataPoint[] = Array.from({ length: DAYS }, (_, i) => {
  const date = dayAfterStart(i);
  const day = date.getDay();
  const weekend = day === 0 || day === 6;
  const wave = Math.abs(Math.sin(i * 0.21)) + Math.abs(Math.cos(i * 0.07));
  const count = weekend
    ? Math.round(wave * 2)
    : Math.round(wave * 9) + ((i * 7) % 3);
  return { date, count };
});

const TOTAL = DATA.reduce((sum, point) => sum + point.count, 0);

export function ActivityGraphDemo() {
  return (
    <ActivityGraph
      data={DATA}
      start={START}
      end={END}
      title="Agent runs"
      total={`${TOTAL.toLocaleString("en-US")} in 6 months`}
    />
  );
}
