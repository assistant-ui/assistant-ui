import { Column, formatCompact } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Quarterly revenue, seven quarters",
    setup:
      "The CFO's favorite slide: revenue by quarter, latest highlighted. Columns instead of a line because each quarter is a closed book, not a sample of a curve.",
    read: "Six quarters of stair-step growth with one flat landing in the middle — the quarter sales won't discuss. The highlighted bar is the largest yet, which is why this chart opens the all-hands instead of closing it.",
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
    setup:
      "A museum plans staffing from turnstile counts. One column per weekday, averaged over the season — including the day the doors stay shut.",
    read: "Saturday towers over the week and Monday is honestly zero, because Monday is closed and the chart refuses to hide it. The Friday ramp says late-week programming works; the Tuesday trough says the school-visit slots have room.",
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
    setup:
      "A transport ministry charts EV registrations by year to evaluate the subsidy it just ended. Columns fit because years are discrete and the last one needs to be pointable-at.",
    read: "Each column nearly doubles the one before — until 2025, the first year without the subsidy, highlighted and lower. One bar turns a policy debate concrete: growth didn't stop, but the doubling did.",
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
