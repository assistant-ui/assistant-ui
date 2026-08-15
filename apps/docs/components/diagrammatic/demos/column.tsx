import { Column, formatCompact } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Quarterly revenue, seven quarters",
    note: "The latest quarter is the one highlighted; everything before is context.",
    chart: (
      <Column
        title="Quarterly revenue"
        items={[
          { label: "Q1", value: 3_800_000 },
          { label: "Q2", value: 5_200_000 },
          { label: "Q3", value: 4_400_000 },
          { label: "Q4", value: 6_600_000 },
          { label: "Q1", value: 5_800_000 },
          { label: "Q2", value: 7_400_000 },
          { label: "Q3", value: 9_000_000 },
        ]}
        highlight="last"
        format={(v) => `$${formatCompact(v)}`}
      />
    ),
  },
  {
    title: "Museum visitors by day of week",
    note: "Saturday towers over the week; Monday is closed and honestly zero.",
    chart: (
      <Column
        title="Visitors by weekday"
        items={[
          { label: "Mon", value: 0 },
          { label: "Tue", value: 1_850 },
          { label: "Wed", value: 2_100 },
          { label: "Thu", value: 2_400 },
          { label: "Fri", value: 3_200 },
          { label: "Sat", value: 5_600 },
          { label: "Sun", value: 4_900 },
        ]}
        format={(v) => formatCompact(v)}
      />
    ),
  },
  {
    title: "Electric cars sold per year",
    note: "Each column nearly doubles the one before it until the subsidy ends in 2025.",
    chart: (
      <Column
        title="EVs sold per year"
        items={[
          { label: "'19", value: 12_000 },
          { label: "'20", value: 19_000 },
          { label: "'21", value: 38_000 },
          { label: "'22", value: 71_000 },
          { label: "'23", value: 128_000 },
          { label: "'24", value: 204_000 },
          { label: "'25", value: 187_000 },
        ]}
        highlight="last"
        format={(v) => formatCompact(v)}
      />
    ),
  },
];
