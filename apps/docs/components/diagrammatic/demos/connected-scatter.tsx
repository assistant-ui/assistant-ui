import { ConnectedScatter } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";
import { Paper, Report } from "./scenes";

export const glyph = (
  <ConnectedScatter
    title="Inflation against unemployment"
    points={[
      { x: 3.9, y: 2.4, label: "2018" },
      { x: 3.7, y: 1.8 },
      { x: 8.1, y: 1.2 },
      { x: 5.4, y: 4.7 },
      { x: 3.6, y: 8 },
      { x: 3.5, y: 4.1 },
      { x: 3.9, y: 3.1 },
      { x: 4.1, y: 2.7, label: "2025" },
    ]}
    xLabel="unemployment %"
    yLabel="inflation %"
  />
);

export const examples: DemoExample[] = [
  {
    title: "The frontier chart: score against cost, families as threads",
    setup:
      "The chart every model comparison ends on: each family is a series of test-time configs threaded through score-vs-cost space, standalone models are single labeled markers, and marker shape carries identity alongside color. Built with the `series` prop — three families, four solo entries, seven identities told apart by shape and hue together.",
    read: "atlas-1's thread owns the top but pays for it: its last 1.1 points cost $2.80 each. nova's curve sits above atlas-0 at every shared price — same spend, more score — and swift's lone marker is the chart's headline: 45.8 at $1.90, left of every thread. The trailing solos cluster under $3.50 where the frontier argument is already lost.",
    chart: (
      <Report
        title="FrontierBench 1.1"
        chip="Score vs Cost ($)"
        note="Score: weighted aggregate of rubric items. Cost: mean USD per rollout."
      >
        <ConnectedScatter
          title="Score against cost per rollout"
          series={[
            {
              name: "atlas-1",
              points: [
                { x: 2.4, y: 35.1 },
                { x: 3.7, y: 40.4 },
                { x: 4.3, y: 41.0 },
                { x: 6.8, y: 45.5 },
                { x: 9.6, y: 46.6 },
              ],
            },
            {
              name: "nova",
              points: [
                { x: 1.7, y: 30.5 },
                { x: 2.6, y: 36.6 },
                { x: 3.3, y: 40.5 },
                { x: 4.1, y: 43.0 },
              ],
            },
            {
              name: "atlas-0",
              points: [
                { x: 2.5, y: 27.6 },
                { x: 3.2, y: 28.9 },
                { x: 5.1, y: 35.2 },
                { x: 6.9, y: 34.9 },
                { x: 9.1, y: 38.6 },
              ],
            },
            { name: "swift", points: [{ x: 1.9, y: 45.8 }] },
            { name: "quill", points: [{ x: 3.1, y: 31.6 }] },
            { name: "pico", points: [{ x: 3.4, y: 26.2 }] },
            { name: "glacier", points: [{ x: 2.9, y: 24.5 }] },
          ]}
          xLabel="avg cost (USD) per rollout"
          yLabel="score (%)"
        />
      </Report>
    ),
  },
  {
    title: "Inflation against unemployment, 2018 to 2025",
    setup:
      "An economics desk plots the two macro variables every central banker stares at — but instead of two time series, it threads the years through one plane. Time rides the path, not an axis.",
    read: "The loop is the whole story: out to the pandemic corner, up through the inflation spike, and back to almost exactly where 2018 stood. Seven dramatic years that netted out to a round trip — a shape no pair of line charts can draw.",
    chart: (
      <Paper
        kicker="Economy"
        title="The loop, 2018–2025"
        source="Source: bureau of labor statistics"
      >
        <FigTooltip
          labels={[
            "2018",
            "2019",
            "2020",
            "2021",
            "2022",
            "2023",
            "2024",
            "2025",
          ]}
          series={{
            "unemployment %": [3.9, 3.7, 8.1, 5.4, 3.6, 3.5, 3.9, 4.1],
            "inflation %": [2.4, 1.8, 1.2, 4.7, 8, 4.1, 3.1, 2.7],
          }}
        >
          <ConnectedScatter
            title="Inflation against unemployment"
            points={[
              { x: 3.9, y: 2.4, label: "2018" },
              { x: 3.7, y: 1.8 },
              { x: 8.1, y: 1.2 },
              { x: 5.4, y: 4.7 },
              { x: 3.6, y: 8 },
              { x: 3.5, y: 4.1 },
              { x: 3.9, y: 3.1 },
              { x: 4.1, y: 2.7, label: "2025" },
            ]}
            xLabel="unemployment %"
            yLabel="inflation %"
          />
        </FigTooltip>
      </Paper>
    ),
  },
];
