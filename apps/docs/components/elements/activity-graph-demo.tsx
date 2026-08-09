"use client";

import type { DataPoint } from "heat-graph";
import { ActivityGraph } from "@/components/elements/activity-graph";

const START = new Date(Date.UTC(2026, 1, 2));
const DAY = 86_400_000;
const DAYS = 182;
const END = new Date(START.getTime() + (DAYS - 1) * DAY);

const DATA: readonly DataPoint[] = Array.from({ length: DAYS }, (_, i) => {
  const weekday = (i + 1) % 7;
  const weekend = weekday === 0 || weekday === 6;
  const wave = Math.abs(Math.sin(i * 0.21)) + Math.abs(Math.cos(i * 0.07));
  const count = weekend
    ? Math.round(wave * 2)
    : Math.round(wave * 9) + ((i * 7) % 3);
  return { date: new Date(START.getTime() + i * DAY), count };
});

const TOTAL = DATA.reduce((sum, point) => sum + point.count, 0);

export function ActivityGraphDemo() {
  return (
    <ActivityGraph
      data={DATA}
      start={START}
      end={END}
      title="Agent runs"
      total={`${TOTAL.toLocaleString()} in 6 months`}
    />
  );
}
