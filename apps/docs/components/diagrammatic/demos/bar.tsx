import { Bar } from "diagrammatic";
import type { DemoExample } from "./types";
import { Report } from "./scenes";

export const glyph = (
  <Bar
    title="Weekly npm downloads"
    items={[
      { label: "react", value: 25_000_000 },
      { label: "vue", value: 12_000_000 },
      { label: "svelte", value: 6_200_000 },
      { label: "solid", value: 2_100_000 },
      { label: "qwik", value: 900_000 },
    ]}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Weekly npm downloads across frameworks",
    setup:
      "A tech lead is asked, again, whether the team bet on the right framework, and pulls one week of npm downloads for the shortlist. Horizontal bars, ranked, values at the end.",
    read: "The gap between first and second is the chart: react's bar is double vue's and everything else shares the leftovers. Whatever the benchmarks say, the ecosystem gravity is not close.",
    chart: (
      <Report
        title="Weekly npm downloads"
        chip="top 5"
        note="Downloads from the public registry, week of launch."
      >
        <Bar
          title="Weekly npm downloads"
          items={[
            { label: "react", value: 25_000_000 },
            { label: "vue", value: 12_000_000 },
            { label: "svelte", value: 6_200_000 },
            { label: "solid", value: 2_100_000 },
            { label: "qwik", value: 900_000 },
          ]}
        />
      </Report>
    ),
  },
];
