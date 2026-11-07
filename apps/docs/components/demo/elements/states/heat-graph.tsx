"use client";

import { useState } from "react";
import type { DataPoint } from "heat-graph";
import { HeatGraph } from "@/components/assistant-ui/elements/heat-graph";
import { defineStates } from "./types";

const DAYS = 371;

// Fixtures mount only after the switcher reads the URL, so reading today here cannot mismatch hydration.
function buildYear(count: (daysAgo: number) => number): DataPoint[] {
  const today = new Date();
  return Array.from({ length: DAYS }, (_, daysAgo) => ({
    date: new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - daysAgo,
    ),
    count: count(daysAgo),
  }));
}

function Graph({ count }: { count: (daysAgo: number) => number }) {
  const [data] = useState(() => buildYear(count));
  return (
    <div className="w-full max-w-2xl min-w-125 scale-[0.82]">
      <HeatGraph data={data} />
    </div>
  );
}

const none = () => 0;
// A handful of active days scattered across the year.
const sparse = (daysAgo: number) =>
  [3, 17, 40, 41, 96, 150, 211, 260, 300].includes(daysAgo)
    ? 1 + (daysAgo % 4)
    : 0;
// Activity every day, heavier on weekdays.
const busy = (daysAgo: number) =>
  8 + ((daysAgo * 7) % 11) + (daysAgo % 7 < 5 ? 6 : 0);
// Quiet until the last month, then a burst.
const recent = (daysAgo: number) =>
  daysAgo < 30 ? 4 + ((daysAgo * 5) % 13) : 0;

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "empty",
    label: "Empty",
    note: "No activity in the window, so every cell sits at the lowest level.",
    Component: () => <Graph count={none} />,
  },
  {
    key: "sparse",
    label: "Sparse",
    note: "A few active days scattered across an otherwise quiet year.",
    Component: () => <Graph count={sparse} />,
  },
  {
    key: "recent-burst",
    label: "Recent burst",
    note: "All the activity falls in the last month at the right edge.",
    Component: () => <Graph count={recent} />,
  },
  {
    key: "busy",
    label: "Busy",
    note: "Activity every day, spread across all intensity levels.",
    Component: () => <Graph count={busy} />,
  },
]);
