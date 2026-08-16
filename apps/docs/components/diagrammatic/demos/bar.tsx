import { Bar } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
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
    read: "The gap between first and second is the chart: react's bar is double vue's, and only two frameworks clear the dashed 10m line. From fifth down the remaining four together do not add up to svelte alone. Whatever the benchmarks say, the ecosystem gravity is not close.",
    chart: (
      <Report
        title="Weekly npm downloads"
        chip="top 9"
        note="Downloads from the public registry, week of launch."
      >
        <FigTooltip
          labels={[
            "react",
            "vue",
            "angular",
            "svelte",
            "preact",
            "solid",
            "lit",
            "qwik",
            "stencil",
          ]}
          series={{
            downloads: [
              "25m",
              "12m",
              "9.1m",
              "6.2m",
              "4.4m",
              "2.1m",
              "1.6m",
              "900k",
              "600k",
            ],
          }}
        >
          <Bar
            title="Weekly npm downloads"
            items={[
              { label: "react", value: 25_000_000 },
              { label: "vue", value: 12_000_000 },
              { label: "angular", value: 9_100_000 },
              { label: "svelte", value: 6_200_000 },
              { label: "preact", value: 4_400_000 },
              { label: "solid", value: 2_100_000 },
              { label: "lit", value: 1_600_000 },
              { label: "qwik", value: 900_000 },
              { label: "stencil", value: 600_000 },
            ]}
            xTicks={[
              { at: 0, label: "0" },
              { at: 10_000_000, label: "10m" },
              { at: 20_000_000, label: "20m" },
            ]}
            target={{ at: 10_000_000, label: "10m club" }}
          />
        </FigTooltip>
      </Report>
    ),
  },
];
